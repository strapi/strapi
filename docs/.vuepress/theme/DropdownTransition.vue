<template>
  <transition name="dropdown"
              @enter="setHeight"
              @after-enter="unsetHeight"
              @before-leave="setHeight">
    <slot></slot>
  </transition>
</template>

<script>
export default {
  name: 'DropdownTransition',
  methods: {
    setHeight (items) {
      // explicitly set height so that it can be transitioned
      items.style.height = items.scrollHeight + 'px'
    },
    unsetHeight (items) {
      items.style.height = ''
    }
  }
}
</script>

<style lang="stylus">
.dropdown-enter, .dropdown-leave-to
  height 0 !important

</style>
