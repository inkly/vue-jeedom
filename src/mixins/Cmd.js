import { createNamespacedHelpers } from 'vuex'
const { mapGetters, mapActions } = createNamespacedHelpers('data')

export const CmdMixin = {
  computed: {
    ...mapGetters(['getCmdById', 'getCmdsByEqLogicId', 'getCmdStatisticsById']),
  },
  methods: {
    getBatteryLevelIconClass (level) {
      let iconClass = 'fa fa-battery-full'
      if (level < 20) {
        iconClass = 'fa fa-battery-empty'
      } else if (level < 40) {
        iconClass = 'fa fa-battery-quarter'
      } else if (level < 60) {
        iconClass = 'fa fa-battery-half'
      } else if (level < 80) {
        iconClass = 'fa fa-battery-three-quarters'
      }
      return iconClass
    },
    getIconClass (cmd) {
      switch (cmd.logicalId) {
        case 'refresh':
          return 'fa fa-sync-alt'
        case 'wol':
          return 'fa fa-bolt'
      }
      switch (cmd.genericType) {
        case 'FLAP_DOWN':
          return 'fa fa-angle-double-down'
        case 'FLAP_STOP':
          return 'fa fa-stop'
        case 'FLAP_UP':
          return 'fa fa-angle-double-up'
        case 'HUMIDITY':
        case 'RAIN_CURRENT':
          return 'fa fa-tint'
        case 'TEMPERATURE': {
          const min = cmd.minValue || 0
          const max = cmd.maxValue || 100
          const interval = (max - min) / 5
          if (cmd.currentValue < min + interval) {
            return 'fa fa-thermometer-empty'
          }
          if (cmd.currentValue < min + 2 * interval) {
            return 'fa fa-thermometer-quarter'
          }
          if (cmd.currentValue < min + 3 * interval) {
            return 'fa fa-thermometer-half'
          }
          if (cmd.currentValue < min + 4 * interval) {
            return 'fa fa-thermometer-three-quarters'
          }
          return 'fa fa-thermometer-full'
        }
        case 'LIGHT_STATE':
          return 'fas fa-lightbulb'
        case 'CO2':
          return 'fa fa-bullseye'
        case 'PRESENCE':
          return 'fas fa-eye'
        case 'WIND_DIRECTION':
          return 'far fa-compass'
        case 'WIND_SPEED':
          return 'fas fa-wind'
        case 'VOLTAGE':
        case 'POWER':
          return 'fa fa-bolt'
        case 'CAMERA_RECORD_STATE':
          return 'fas fa-video'
        case 'ENERGY_STATE':
          return 'fas fa-power-off'
      }
      if (cmd.icon) {
        return cmd.icon.match(/class="(.*?)"/)[1] || 'fa fa-question'
      }
      return 'fa fa-question'
    },
    ...mapActions(['execCmd', 'loadCmdStatistics']),
  },
}
