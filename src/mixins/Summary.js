import { mapGetters } from 'vuex'

export const SummaryMixin = {
  computed: {
    ...mapGetters(['objectsSummaryById']),
  },
  methods: {
    getSummaryIconClass (key) {
      switch (key) {
        case 'humidity':
          return 'fa fa-tint'
        case 'temperature':
          return 'fa fa-thermometer-half'
        case 'light':
          return 'fa fa-lightbulb'
        case 'power':
          return 'fa fa-bolt'
      }
      return ''
    },
    getSummaryUnit (key) {
      switch (key) {
        case 'humidity':
          return '%'
        case 'temperature':
          return '°C'
        case 'light':
          return ''
        case 'power':
          return ' W'
      }
      return ''
    },
  },
}
