<template>
  <section class="hero">
    <div class="hero-head">
      <breadcrumb :items="[{link: {name: 'objects'}, icon: 'fa-home', text: 'Objets', isActive: true}]" :summary="summary" />
    </div>
    <div class="hero-body has-padding-horizontal-7">
      <div class="container">
        <div class="field">
          <p class="control has-icons-left">
            <input v-model="search" class="input" type="text" placeholder="Rechercher un objet">
            <span class="icon is-small is-left"><i class="fas fa-search" /></span>
          </p>
        </div>
        <div class="columns is-multiline">
          <object-tile v-for="object in ordered" :id="object.id" :key="object.id" />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ObjectsMixin } from '@/mixins/Objects'
import { SummaryMixin } from '@/mixins/Summary'
import Breadcrumb from '@/components/Breadcrumb'
import ObjectTile from '@/components/ObjectTile'

export default {
  name: 'Objects',
  components: {
    Breadcrumb,
    ObjectTile,
  },
  mixins: [ObjectsMixin, SummaryMixin],
  data () {
    return {
      search: '',
    }
  },
  computed: {
    ordered () { return this.objectsOrdered.filter((object) => object.eqLogics.length > 0 && object.name.toLowerCase().indexOf(this.search.toLowerCase()) > -1) },
    summary () { return this.getObjectSummaryById(0) },
  },
}
</script>
