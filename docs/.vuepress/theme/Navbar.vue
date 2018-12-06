<template>
  <header class="navbar">
    <SidebarButton @toggle-sidebar="$emit('toggle-sidebar')"/>
    <router-link :to="$localePath" class="home-link">
      <img class="logo"
        v-if="$site.themeConfig.logo"
        :src="$withBase($site.themeConfig.logo)">
      <span class="site-name"
        v-if="$siteTitle"
        :class="{ 'can-hide': $site.themeConfig.logo }">
        {{ $siteTitle }}
      </span>
    </router-link>
    <select @input="changeVersion($event.target.value)" class="version-selector">
      <option v-for="version in versions" :value="version.path" :selected="!!~$page.path.indexOf(version.path)">{{version.name}}</option>
    </select>
    <div class="links">
      <AlgoliaSearchBox v-if="isAlgoliaSearch" :options="algolia"/>
      <SearchBox v-else-if="$site.themeConfig.search !== false"/>
      <NavLinks class="can-hide"/>
    </div>
  </header>
</template>

<script>
import SidebarButton from './SidebarButton.vue'
import AlgoliaSearchBox from '@AlgoliaSearchBox'
import SearchBox from './SearchBox.vue'
import NavLinks from './NavLinks.vue'

export default {
  components: { SidebarButton, NavLinks, SearchBox, AlgoliaSearchBox },
  computed: {
    versions() {
      const { themeConfig } = this.$site
      return themeConfig.versions.map(version => ({
        name: version[0],
        path: version[1],
      }))
    },
    algolia () {
      return this.$themeLocaleConfig.algolia || this.$site.themeConfig.algolia || {}
    },
    isAlgoliaSearch () {
      return this.algolia && this.algolia.apiKey && this.algolia.indexName
    }
  },
  methods: {
    changeVersion(to) {
      this.$router.push(to)
    }
  }
}
</script>

<style lang="stylus">
@import './styles/config.styl'

.navbar
  padding 0.7rem 1.5rem
  line-height $navbarHeight - 1.4rem
  position relative
  a, span, img
    display inline-block
  .logo
    height $navbarHeight - 1.4rem
    min-width $navbarHeight - 1.4rem
    margin-right 0.8rem
    vertical-align top
  .site-name
    font-size 1.3rem
    font-weight 600
    color $textColor
    position relative
  .links
    font-size 0.9rem
    position absolute
    right 1.5rem
    top 0.7rem

@media (max-width: $MQMobile)
  .navbar
    padding-left 4rem
    .can-hide
      display none
</style>
