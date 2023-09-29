'use strict';

module.exports = ({ strapi }) => ({
  verifyProjectIsVersionedOnGit(ctx) {
    ctx.body = strapi.plugin('cloud').service('cloud').verifyProjectIsVersionedOnGit();
  },
});
