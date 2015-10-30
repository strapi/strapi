'use strict';

/**
 * Policy used to check if the `dashboardToken` field is valid.
 *
 * @param next
 */

module.exports = function * (next) {
  // Format dashboardToken variables.
  const dashboardTokenParam = this.request.query.dashboardToken || this.request.body.dashboardToken;
  const dashboardTokenConfig = strapi.config.dashboard && strapi.config.dashboard.token;

  // Check dashboardToken for security purposes.
  if (!dashboardTokenParam || !dashboardTokenConfig || dashboardTokenParam !== dashboardTokenConfig) {
    this.status = 401;
    this.body = {
      message: 'dashboardToken parameter is invalid.'
    };
  } else {
    // Delete `dashboardToken` field.
    delete this.request.query.dashboardToken;
    delete this.request.body.dashboardToken;

    yield next;
  }
};
