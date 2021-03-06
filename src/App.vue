<template>
  <div>
    <navbar v-if="isAuthenticated" />
    <sidebar v-if="isAuthenticated" />
    <router-view v-if="isReady" :key="$route.fullPath" />
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
const { mapState, mapMutations } = createNamespacedHelpers('app')
const { mapActions } = createNamespacedHelpers('data')

export default {
  components: {
    Navbar,
    Sidebar,
  },
  data () {
    return {
      isReady: false,
      refreshing: false,
      registration: null,
    }
  },
  computed: {
    ...mapState(['isAuthenticated', 'information']),
  },
  watch: {
    isAuthenticated: function () {
      if (this.isAuthenticated) {
        this.loadObjects()
      }
      this.openEventsListener()
    },
    information: function (information) {
      if (information.message) {
        const toast = {
          message: information.message,
          type: information.type,
        }
        if (information.position) {
          toast.position = information.position
        }
        if (information.duration) {
          toast.duration = information.duration
        }
        this.$buefy.toast.open(toast)
      }
    },
  },
  created () {
    // handle update from service worker
    document.addEventListener(
      'updated', this.askForRefresh, { once: true },
    )
    // reload page if requested by service worker
    navigator.serviceWorker.addEventListener(
      'controllerchange', () => {
        if (this.refreshing) {
          return
        }
        this.refreshing = true
        window.location.reload()
      },
    )
    // load objects
    if (this.isAuthenticated) {
      this.loadObjects()
    }
    // handle connectivity
    this.setNetworkStatus(window.navigator.onLine)
    window.addEventListener('offline', this.notifyConnectivity)
    window.addEventListener('online', this.notifyConnectivity)
    // listen events
    this.openEventsListener()
    this.isReady = true
  },
  methods: {
    // display confirm dialog for refreshing application
    askForRefresh (e) {
      this.registration = e.detail
      this.$buefy.dialog.confirm({
        title: 'Mise à jour',
        message: 'Une mise à jour a été téléchargée, souhaitez-vous recharger l\'application ?',
        cancelText: 'Plus tard',
        hasIcon: true,
        icon: 'sync-alt',
        iconPack: 'fa',
        onConfirm: () => this.refreshApp(),
      })
    },
    // refresh application from updated service worker
    refreshApp () {
      if (!this.registration || !this.registration.waiting) {
        return
      }
      this.registration.waiting.postMessage('skipWaiting')
    },
    // store network status
    notifyConnectivity (event) {
      this.setNetworkStatus(window.navigator.onLine)
      if (event.type === 'online') {
        // reconnect to socket
        this.openEventsListener()
      }
    },
    openEventsListener () {
      if (this.isAuthenticated) {
        this.$JeedomApi.openEventsListener(true, false)
      }
    },
    ...mapActions(['loadObjects']),
    ...mapMutations(['setNetworkStatus']),
  },
}
</script>
