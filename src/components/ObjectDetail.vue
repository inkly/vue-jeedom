<template>
  <section class="hero">
    <div class="hero-head">
      <breadcrumb :items.sync="breadcrumbItems" :summary="summary" />
    </div>
    <div class="hero-body">
      <div class="container">
        <ul>
          <li v-for="eqLogicId in object.eqLogics" :key="eqLogicId">
            <eq-logic :id="eqLogicId" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script>
import EqLogic from '@/components/EqLogic'
import Breadcrumb from '@/components/Breadcrumb'
import { SummaryMixin } from '@/mixins/Summary'
import { ObjectMixin } from '@/mixins/Object'

export default {
  name: 'ObjectDetail',
  components: {
    Breadcrumb,
    EqLogic,
  },
  mixins: [SummaryMixin, ObjectMixin],
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data () {
    return {
      breadcrumbItems: [],
    }
  },
  computed: {
    object () { return this.getObjectById(this.id) },
    title () { return this.object.name },
    summary () { return this.getObjectSummaryById(this.id) },
  },
  watch: {
    title: {
      handler (title) {
        document.title = document.title.replace('Objet |', title + ' |')
        this.breadcrumbItems[1].text = title
      },
      deep: true,
    },
  },
  created () {
    this.breadcrumbItems = [
      { link: { name: 'objects' }, icon: 'fa-home', text: 'Objets' },
      { link: { name: 'objects', params: { id: this.object.id } }, icon: 'fa-cube', text: this.object.name, isActive: true },
    ]
  },
}
</script>
