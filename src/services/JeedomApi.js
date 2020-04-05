import axios from 'axios'

export default {
  install (Vue, options = { jsonRpcApiUrl: null, websocketUrl: null, store: null }) {
    const jsonRpcApiUrl = options.jsonRpcApiUrl
    const websocketUrl = options.websocketUrl
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
      events.result.forEach((event) => {
        switch (event.name) {
          case 'cmd::update':
            store.commit('updateCmd', event.option)
            break
          case 'jeeObject::summary::update':
            for (const key in event.option.keys) {
              store.commit('saveObjectSummary', { id: event.option.object_id, key, value: event.option.keys[key].value })
            }
            break
          default:
            break
        }
      })
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
        if (websocketUrl === null) {
          // websocket url not set, fallback to HTTP polling
          this.openEventsListenerFallback(true)
          return
        }
        if (!apiKey) {
          console.warn('Missing API key')
          store.commit('setInformation', { type: 'is-danger', message: 'Erreur d\'authentification, veuillez-vous reconnecter' })
          store.commit('setUser', { login: null, isAuthenticated: false })
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
          store.commit('setEventsListenerStatus', true)
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
          store.commit('setEventsListenerStatus', false)
          isSocketOpen = false
          switch (event.code) {
            case 1000:
            case 1001:
              // normal closure, do nothing
              break
            case 1006:
              // abnormal closure
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
          store.commit('setEventsListenerStatus', false)
        }
      },

      // request events by JSON-RPC API
      async openEventsListenerFallback (isPolling) {
        try {
          store.commit('setEventsListenerStatus', true)
          const events = await jsonRpcCall('event::changes', { datetime: lastEventsTimestamp })
          lastEventsTimestamp = events.datetime
          handleEventsResponse(events)
          if (isPolling) {
            timerId = setTimeout(function () { this.openEventsListenerFallback(true) }.bind(this), readDelay)
          }
          return
        } catch (error) {
          store.commit('setEventsListenerStatus', false)
          store.commit('setInformation', { type: 'is-danger', message: 'Erreur de communication avec le serveur' })
          console.error(error)
        }
      },

      // request all objects and returns only visible ones
      async getObjects () {
        try {
          const objects = await jsonRpcCall('object::all')
          return objects.filter((object) => object.isVisible === '1')
        } catch (error) {
          console.error(error)
        }
      },

      // request an objects and its equipments and commands, returns only visible ones
      async getObject (objectId) {
        try {
          const object = await jsonRpcCall('object::fullById', { id: objectId })
          object.eqLogics = object.eqLogics.filter((eqLogic) => eqLogic.isVisible === '1').map((eqLogic) => {
            eqLogic.cmds = eqLogic.cmds.filter((cmd) => cmd.isVisible === '1').sort((a, b) => a.order - b.order)
            return eqLogic
          })
          return object
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

    }
  },
}