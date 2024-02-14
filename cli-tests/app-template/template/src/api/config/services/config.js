module.exports = {
  async rateLimitEnable(value) {
    strapi.config.set('admin.rateLimit.enabled', !!value);
  },
  async adminAutoOpenEnable(value) {
    strapi.config.set('admin.autoOpen', !!value);
  },
};
