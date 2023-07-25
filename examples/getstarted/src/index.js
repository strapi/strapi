'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const roleService = strapi.service(`admin::role`);
    const permissionService = strapi.service(`admin::permission`);

    // roleService.assignPermissions('1', [
    //   {
    //     uid: 'review-workflows.change-stage',
    //     displayName: 'Change stage',
    //     pluginName: 'admin',
    //     section: 'internal',
    //     actionParameters: {
    //       from: 1,
    //       to: 2,
    //     },
    //   },
    // ]);
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
