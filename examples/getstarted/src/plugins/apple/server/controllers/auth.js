'use strict';

module.exports = ({ strapi }) => ({
  callback(ctx) {
    const { id_token } = ctx.request.body;

    ctx.redirect(`/api/auth/apple/callback?access_token=${id_token}`);
  },
});
