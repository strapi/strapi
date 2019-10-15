<template>
  <form id="search-form" class="algolia-search-wrapper search-box">
    <input id="algolia-search-input" class="search-query">
  </form>
</template>

<script>
export default {
  props: ['options'],
  mounted () {
    this.initialize()
  },
  methods: {
    initialize () {
      Promise.all([
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.js'),
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.css')
      ]).then(([docsearch]) => {
        docsearch = docsearch.default
        docsearch(Object.assign(this.options, {
          inputSelector: '#algolia-search-input'
        }))
      })
    }
  },
  watch: {
    options (newValue) {
      this.$el.innerHTML = '<input id="algolia-search-input" class="search-query">'
      this.initialize(newValue)
    }
  }
}
</script>

<style lang="stylus">
@import './styles/config.styl'

.algolia-search-wrapper
  .algolia-autocomplete
    .ds-dropdown-menu
      width: 500px
    .algolia-docsearch-suggestion
      .algolia-docsearch-suggestion--category-header
        color: black
        border-bottom 1px solid gray
      .algolia-docsearch-suggestion--wrapper
        float none
      .algolia-docsearch-suggestion--subcategory-column
        vertical-align middle
        display inline-block
        float: none
        line-height 25px
        color gray
        .algolia-docsearch-suggestion--highlight
          color: gray
          background: inherit
          padding: 0
      .algolia-docsearch-suggestion--content
        vertical-align middle
        width 69%
        display inline-block
        float: none
        line-height 25px
        &:before
          width 0
      .algolia-docsearch-suggestion--title
        font-weight bold
        color black
      .algolia-docsearch-suggestion--text
        font-size 0.8rem
        color gray


</style>
