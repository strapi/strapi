<template>
  <nav class="nav-links" v-if="userLinks.length || repoLink">
    <!-- user links -->
    <div
      class="nav-item"
      v-for="item in userLinks"
      :key="item.link">
      <DropdownLink v-if="item.type === 'links'" :item="item"/>
      <NavLink v-else :item="item"/>
    </div>
    <!-- repo link -->
    <a
      :href="websiteLink"
      class="repo-link"
      target="_blank"
      rel="noopener noreferrer">
      Website
      <OutboundLink/>
    </a>
    <a
      :href="blogLink"
      class="repo-link"
      target="_blank"
      rel="noopener noreferrer">
      Blog
      <OutboundLink/>
    </a>
    <a
      :href="slackLink"
      class="repo-link"
      target="_blank"
      rel="noopener noreferrer">
      Slack
      <OutboundLink/>
    </a>
    <a v-if="repoLink"
       :href="repoLink"
       class="repo-link"
       target="_blank"
       rel="noopener noreferrer">
      {{ repoLabel }}
      <OutboundLink/>
    </a>
  </nav>
</template>

<script>
import DropdownLink from './DropdownLink.vue'
import { resolveNavLinkItem } from './util'
import NavLink from './NavLink.vue'

export default {
  components: { NavLink, DropdownLink },
  computed: {
    userNav () {
      return this.$themeLocaleConfig.nav || this.$site.themeConfig.nav || []
    },
    nav () {
      const { locales } = this.$site
      if (locales && Object.keys(locales).length > 1) {
        const currentLink = this.$page.path
        const routes = this.$router.options.routes
        const themeLocales = this.$site.themeConfig.locales || {}
        const languageDropdown = {
          text: this.$themeLocaleConfig.selectText || 'Languages',
          items: Object.keys(locales).map(path => {
            const locale = locales[path]
            const text = themeLocales[path] && themeLocales[path].label || locale.lang
            let link
            // Stay on the current page
            if (locale.lang === this.$lang) {
              link = currentLink
            } else {
              // Try to stay on the same page
              link = currentLink.replace(this.$localeConfig.path, path)
              // fallback to homepage
              if (!routes.some(route => route.path === link)) {
                link = path
              }
            }
            return { text, link }
          })
        }
        return [...this.userNav, languageDropdown]
      }
      return this.userNav
    },
    userLinks () {
      return (this.nav || []).map(link => {
        return Object.assign(resolveNavLinkItem(link), {
          items: (link.items || []).map(resolveNavLinkItem)
        })
      })
    },
    repoLink () {
      const { repo } = this.$site.themeConfig
      if (repo) {
        return /^https?:/.test(repo)
          ? repo
          : `https://github.com/${repo}`
      }
    },
    repoLabel () {
      if (!this.repoLink) return
      if (this.$site.themeConfig.repoLabel) {
        return this.$site.themeConfig.repoLabel
      }

      const repoHost = this.repoLink.match(/^https?:\/\/[^/]+/)[0]
      const platforms = ['GitHub', 'GitLab', 'Bitbucket']
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i]
        if (new RegExp(platform, 'i').test(repoHost)) {
          return platform
        }
      }

      return 'Source'
    },
    websiteLink () {
      const { website } = this.$site.themeConfig
      if (website) {
        return /^https?:/.test(website)
          ? website
          : `https://${website}`
      }
    },
    slackLink () {
      const { slack } = this.$site.themeConfig
      if (slack) {
        return /^https?:/.test(slack)
          ? slack
          : `https://${slack}`
      }
    },
    blogLink () {
      const { blog } = this.$site.themeConfig
      if (blog) {
        return /^https?:/.test(blog)
          ? blog
          : `https://${blog}`
      }
    }
  }
}
</script>

<style lang="stylus">
@import './styles/config.styl'

.nav-links
  display inline-block
  a
    line-height 1.4rem
    color inherit
    &:hover, &.router-link-active
      color $accentColor
  .nav-item
    cursor pointer
    position relative
    display inline-block
    margin-left 1.5rem
    line-height 2rem
  .repo-link
    margin-left 1.5rem

@media (max-width: $MQMobile)
  .nav-links
    .nav-item, .repo-link
      margin-left 0

@media (min-width: $MQMobile)
  .nav-links a
    &:hover, &.router-link-active
      color $textColor
  .nav-item > a:not(.external)
    &:hover, &.router-link-active
      margin-bottom -2px
      border-bottom 2px solid lighten($accentColor, 8%)
</style>
