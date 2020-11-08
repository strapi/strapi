<template>
  <form
    id="search-form"
    class="algolia-search-wrapper search-box"
    role="search"
  >
    <input
      id="algolia-search-input"
      class="search-query"
      :placeholder="placeholder"
    >
  </form>
</template>

<script>
export default {
  props: ['options'],
  data () {
    return {
      placeholder: undefined
    }
  },
  mounted () {
    this.initialize(this.options, this.$site, this.$lang)
    this.placeholder = this.$site.themeConfig.searchPlaceholder || ''
  },
  methods: {
    initialize (userOptions, config, lang) {
      Promise.all([
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.js'),
        import(/* webpackChunkName: "docsearch" */ 'docsearch.js/dist/cdn/docsearch.min.css')
      ]).then(([docsearch]) => {
        docsearch = docsearch.default
        const { algoliaOptions = {}} = userOptions
        docsearch(Object.assign(
          {},
          userOptions,
          {
            inputSelector: '#algolia-search-input',
            // #697 Make docsearch work well at i18n mode.
            algoliaOptions: Object.assign({
              'facetFilters': [`lang:${lang}`].concat(algoliaOptions.facetFilters || [])
            }, algoliaOptions),
            handleSelected: (input, event, suggestion) => {
              const { pathname, hash } = new URL(suggestion.url)
              const removedBase = config.base ? '/' + pathname.replace(config.base, '') : pathname;
              this.$router.push(`${removedBase}${hash}`)
            }
          }
        ))
      })
    },
    update (options, lang) {
      this.$el.innerHTML = '<input id="algolia-search-input" class="search-query">'
      this.initialize(options, lang)
    }
  },
  watch: {
    $lang (newValue) {
      this.update(this.options, newValue)
    },
    options (newValue) {
      this.update(newValue, this.$lang)
    }
  }
}
</script>

<style lang="stylus">

.al
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
@media (min-width: $MQMobile)
  .algolia-search-wrapper
    .algolia-autocomplete
      .algolia-docsearch-suggestion
        .algolia-docsearch-suggestion--subcategory-column
          float none
          width 150px
          min-width 150px
          display table-cell
        .algolia-docsearch-suggestion--content
          float none
          display table-cell
          width 100%
          vertical-align top
        .ds-dropdown-menu
          min-width 515px !important
@media (max-width: $MQMobile)
  .algolia-search-wrapper
    .ds-dropdown-menu
      min-width calc(100vw - 4rem) !important
      max-width calc(100vw - 4rem) !important
    .algolia-docsearch-suggestion--wrapper
      padding 5px 7px 5px 5px !important
    .algolia-docsearch-suggestion--subcategory-column
      padding 0 !important
      background white !important
    .algolia-docsearch-suggestion--subcategory-column-text:after
      content " > "
      font-size 10px
      line-height 14.4px
      display inline-block
      width 5px
      margin -3px 3px 0
      vertical-align middle
</style>