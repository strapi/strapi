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

    // TODO: Remove - only for testing
    await roleService.assignPermissions(2, [
      {
        action: 'admin::review-workflows.change-stage',
        actionParameters: { from: 1, to: 2 },
      },
    ]);


    const user = await strapi
      .query('admin::user')
      .findOne({ where: { id: 2 }, populate: ['roles'] });

    if (!user || !(user.isActive === true)) {
      return { authenticated: false };
    }

    const userAbility = await permissionService.engine.generateUserAbility(user);

    console.log(userAbility.can({
      name: 'admin::review-workflows.change-stage',
      params: { from: 1, to: 2 }
    }, 'all'));
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
