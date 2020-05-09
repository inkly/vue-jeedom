import axios from 'axios'

export default {
  install (Vue, options = { jsonRpcApiUrl: null, websocketUrl: null, store: null }) {
    const jsonRpcApiUrl = options.jsonRpcApiUrl
    const websocketUrl = options.websocketUrl
    const statisticsPeriod = options.statisticsPeriod
    const store = options.store
    const socketMaxTry = 3
    const readDelay = 5000
    let apiKey = null
    let websocket = null
    let timerId = null
    let socketErrorCount = 0
    let isSocketOpen = false
    let lastEventsTimestamp = Date.now() / 1000

    // Execute a JSON RPC request and return result
    async function jsonRpcCall (method, params) {
      if (apiKey === null && method !== 'user::getHash') {
        throw new Error('Missing API key')
      }
      // set Axios config
      const config = {
        headers: {
        },
      }
      // set request data
      if (params === undefined) {
        params = {}
      }
      const data = {
        jsonrpc: '2.0',
        id: +new Date(),
        method,
        params,
      }
      // add API key to data
      data.params = { ...data.params, ...{ apikey: apiKey } }
      // execute request
      const response = await axios.post(jsonRpcApiUrl, data, config)
      if (response.data.error) {
        // handle business error
        throw response.data.error
      }
      // return result
      return response.data.result
    }

    function handleEventsResponse (events) {
      lastEventsTimestamp = events.datetime
      const updateCmds = []
      events.result.forEach((event) => {
        switch (event.name) {
          case 'cmd::update': {
            updateCmds.push({
              id: event.option.cmd_id,
              currentValue: event.option.value,
              collectDate: event.option.collectDate,
            })
            break
          }
          case 'jeeObject::summary::update':
            for (const key in event.option.keys) {
              store.commit('data/saveObjectSummary', { id: event.option.object_id, key, value: event.option.keys[key].value })
            }
            break
          default:
            break
        }
      })
      // commit updateCmds batch
      if (updateCmds.length > 0) {
        store.commit('data/updateCmds', updateCmds)
      }
    }

    Vue.prototype.$JeedomApi = {

      // request user API key from his credentials
      async getApiKey (login, password) {
        try {
          return await jsonRpcCall('user::getHash', { login, password })
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // initialize API key
      setApiKey (_apiKey) {
        apiKey = _apiKey
      },

      // suscribe to Jeedom events throught websocket
      openEventsListener (resetCounter, forceRefresh = false) {
        if (!store.state.app.hasNetwork) {
          // no network
          return
        }
        if (websocketUrl === null) {
          // websocket url not set, fallback to HTTP polling
          this.openEventsListenerFallback(true)
          return
        }
        if (!apiKey) {
          console.warn('Missing API key')
          store.commit('app/setInformation', { type: 'is-danger', message: 'Erreur d\'authentification, veuillez-vous reconnecter' })
          store.commit('app/setUser', { login: null, isAuthenticated: false })
          return
        }
        // ensure only one socket
        if (isSocketOpen) {
          console.warn('Socket already opened')
          return
        }
        if (forceRefresh) {
          this.openEventsListenerFallback(false)
        }
        isSocketOpen = true
        // reset error count
        if (resetCounter) {
          socketErrorCount = 0
        }
        // start websocket
        websocket = new WebSocket(websocketUrl)
        // on open connection, execute callback function and send user API key
        websocket.onopen = (event) => {
          console.info('Events socket connection opened')
          const authMsg = JSON.stringify({ apiKey })
          websocket.send(authMsg)
          store.commit('app/setEventsListenerStatus', true)
        }
        // on message, handle events
        websocket.onmessage = (message) => {
          try {
            handleEventsResponse(JSON.parse(message.data))
          } catch (error) {
            console.error('Error during events parsing', error)
          }
        }
        // on error, increment counter
        websocket.onerror = (event) => {
          console.error('Error occurs on events socket', event)
          socketErrorCount++
        }
        // on connection close, store status and retry if it was an abnormal closure
        websocket.onclose = (event) => {
          store.commit('app/setEventsListenerStatus', false)
          isSocketOpen = false
          switch (event.code) {
            case 1000:
            case 1001:
              // normal closure, do nothing
              break
            case 1006:
              // abnormal closure
              if (!store.state.app.hasNetwork) {
                // no network
                console.warn(`Network failure, events socket connection closed (code: ${event.code}, try #${socketErrorCount}/${socketMaxTry})`)
                return
              }
              if (socketErrorCount >= socketMaxTry) {
                console.warn(`Events socket connection closed (code: ${event.code}, try #${socketErrorCount}/${socketMaxTry})`)
                this.openEventsListenerFallback(true)
                return
              }
              // try to reconnect
              console.warn(`Events socket connection closed (code: ${event.code}, try #${socketErrorCount}/${socketMaxTry}), reconnecting...`)
              this.openEventsListener(false, false)
              break
            default:
              console.warn(`Events socket connection closed (code: ${event.code}, try #${socketErrorCount})`)
          }
        }
      },

      // close websocket connection
      closeEventsListener () {
        if (websocket) {
          websocket.close()
        }
        if (timerId) {
          clearTimeout(timerId)
          store.commit('app/setEventsListenerStatus', false)
        }
      },

      // request events by JSON-RPC API
      async openEventsListenerFallback (isPolling) {
        try {
          store.commit('app/setEventsListenerStatus', true)
          const events = await jsonRpcCall('event::changes', { datetime: lastEventsTimestamp })
          lastEventsTimestamp = events.datetime
          handleEventsResponse(events)
          if (isPolling) {
            timerId = setTimeout(function () { this.openEventsListenerFallback(true) }.bind(this), readDelay)
          }
          return
        } catch (error) {
          store.commit('app/setEventsListenerStatus', false)
          store.commit('app/setInformation', { type: 'is-danger', message: 'Erreur de communication avec le serveur' })
          console.error(error)
        }
      },

      // request all objects and returns only visible ones
      async getObjects () {
        try {
          const jObjects = await jsonRpcCall('object::full')
          return jObjects.filter((jObject) => jObject.isVisible === '1').map((jObject) => {
            // construct object
            const object = {
              id: jObject.id,
              name: jObject.name,
              parentId: jObject.father_id,
              summary: {},
              eqLogics: [],
            }
            // set object summary keys
            for (const key in jObject.configuration.summary) {
              let keyHasSummary = false
              const elements = jObject.configuration.summary[key]
              elements.forEach((element) => {
                if (element.enable === '1') {
                  keyHasSummary = true
                }
              })
              if (keyHasSummary) {
                object.summary[key] = true
              }
            }
            // set object eqLogics
            object.eqLogics = jObject.eqLogics.filter((jEqLogic) => jEqLogic.isVisible === '1').map((jEqLogic) => {
            // construct eqLogic
              const eqLogic = {
                id: jEqLogic.id,
                eqTypeName: jEqLogic.eqType_name,
                name: jEqLogic.name,
                genericType: jEqLogic.generic_type,
                status: {
                  battery: jEqLogic.status.battery,
                  lastCommunication: jEqLogic.status.lastCommunication,
                },
                configuration: {
                  type: jEqLogic.configuration.type,
                },
                cmds: [],
                tags: jEqLogic.tags ? jEqLogic.tags.split(',') : [],
              }
              // set eqLogic cmds
              eqLogic.cmds = jEqLogic.cmds.filter((jCmd) => jCmd.isVisible === '1').sort((a, b) => a.order - b.order).map((jCmd) => {
                // construct cmd
                const cmd = {
                  id: jCmd.id,
                  currentValue: jCmd.state,
                  value: jCmd.value,
                  unit: jCmd.unite,
                  name: jCmd.name,
                  type: jCmd.type,
                  subType: jCmd.subType,
                  logicalId: jCmd.logicalId,
                  eqLogicId: jCmd.eqLogic_id,
                  eqType: jCmd.eqType,
                  genericType: jCmd.generic_type,
                  isHistorized: jCmd.isHistorized,
                  icon: jCmd.display.icon,
                  isVisible: jCmd.isVisible,
                  order: jCmd.order,
                }
                if (jCmd.configuration.minValue !== '') {
                  cmd.minValue = parseInt(jCmd.configuration.minValue)
                }
                if (jCmd.configuration.maxValue !== '') {
                  cmd.maxValue = parseInt(jCmd.configuration.maxValue)
                }
                return cmd
              })
              return eqLogic
            })
            return object
          })
        } catch (error) {
          console.error(error)
        }
      },

      // request global summary
      async getSummary () {
        try {
          return await jsonRpcCall('summary::global')
        } catch (error) {
          console.error(error)
        }
      },

      // request key object summary
      async getObjectSummary (objectId, key) {
        try {
          return await jsonRpcCall('summary::byId', { id: objectId, key })
        } catch (error) {
          console.error(error)
        }
      },

      // execute a command
      async cmd (cmdId, options) {
        const params = { id: cmdId }
        if (options) {
          params.options = options
        }
        try {
          return await jsonRpcCall('cmd::execCmd', params)
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // request all scenarios and returns only visible ones
      async getScenarios () {
        try {
          const scenarios = await jsonRpcCall('scenario::all')
          return scenarios.filter((scenario) => scenario.isVisible === '1')
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // change scenario state (run, stop, enable, disable)
      async changeScenarioState (id, state) {
        try {
          return await jsonRpcCall('scenario::changeState', { id, state })
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // request cmd statistics and return min, max and average
      async getStatistics (cmdId, startTime = null, endTime = null) {
        const params = { id: parseInt(cmdId) }
        if (endTime === null) {
          endTime = new Date()
        }
        if (startTime === null) {
          startTime = new Date(endTime.getTime() - statisticsPeriod)
        }
        params.startTime = Vue.moment(startTime).format('YYYY-MM-DD HH:mm:ss')
        params.endTime = Vue.moment(endTime).format('YYYY-MM-DD HH:mm:ss')
        try {
          const statistics = await jsonRpcCall('cmd::getStatistique', params)
          return {
            min: Number.parseFloat(Number.parseFloat(statistics.min).toPrecision(3)),
            avg: Number.parseFloat(Number.parseFloat(statistics.avg).toPrecision(3)),
            max: Number.parseFloat(Number.parseFloat(statistics.max).toPrecision(3)),
          }
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // request cmd history
      async getHistory (cmdId, startTime = null, endTime = null) {
        const params = { id: parseInt(cmdId) }
        if (endTime === null) {
          endTime = new Date()
        }
        if (startTime === null) {
          startTime = new Date(endTime.getTime() - 86400000)
        }
        params.startTime = Vue.moment(startTime).format('YYYY-MM-DD HH:mm:ss')
        params.endTime = Vue.moment(endTime).format('YYYY-MM-DD HH:mm:ss')
        try {
          return await jsonRpcCall('cmd::getHistory', params)
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // try to ask a question
      async askQuestion (query, replyCmd = null) {
        const params = {
          query,
        }
        if (replyCmd !== null) {
          params.reply_cmd = replyCmd
        }
        try {
          const result = await jsonRpcCall('interact::tryToReply', params)
          if (!result.reply) {
            console.error('no reply found')
            throw new Error('Aucune réponse trouvée')
          }
          return result.reply.replace('\\n\\n', '<br/>').replace('\\n', '<br/>')
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // request defined interactions
      async getSentences () {
        try {
          const sentences = await jsonRpcCall('interactQuery::all')
          return sentences.map((sentence) => {
            return sentence.query
          })
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // request system notifications
      async getNotifications () {
        try {
          const notifications = await jsonRpcCall('message::all')
          return notifications.map((log) => {
            // remove HTML encoding
            const txt = document.createElement('textarea')
            txt.innerHTML = log.message
            log.message = txt.value
            return log
          })
        } catch (error) {
          console.error(error)
          throw error
        }
      },

      // delete system notifications
      async clearNotifications () {
        try {
          const result = await jsonRpcCall('message::removeAll')
          if (result !== 'ok') {
            throw new Error('Erreur lors de la suppression')
          }
        } catch (error) {
          console.error(error)
          throw error
        }
      },

    }
  },
}
