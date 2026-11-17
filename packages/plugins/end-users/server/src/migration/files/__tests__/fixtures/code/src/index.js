/* eslint-disable */

module.exports = {
  register({ strapi }) {
    const service = strapi.plugin('users-permissions').service('user');
    const other = strapi.plugin("users-permissions");
    const unrelated = strapi.plugin('upload');
  },
  bootstrap({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      afterCreate() {},
    });
    strapi.db.lifecycles.subscribe({
      models: [
        'api::post.post',
        'plugin::users-permissions.user',
      ],
      afterUpdate() {},
    });
    const uid = 'plugin::users-permissions.user';
    const role = 'plugin::users-permissions.role';
  },
};
