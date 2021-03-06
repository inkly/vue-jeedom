import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import app from '@/store/modules/app'
import data from '@/store/modules/data'

const vuexPersistData = new VuexPersist({
  storage: window.localStorage,
  modules: ['data'],
  // trigger persistence only for data store (except clear to ensure localStorage clearing
  filter: (mutation) => mutation.type.startsWith('data/') && mutation.type !== 'data/clear',
})

Vue.use(Vuex)

export default new Vuex.Store({
  actions: {
    // clear all stores
    clear ({ commit }) {
      commit('app/clear')
      commit('data/clear')
    },
  },
  modules: {
    app,
    data,
  },
  plugins: [vuexPersistData.plugin],
  strict: process.env.NODE_ENV !== 'production',
})
