'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register the callout custom block for backend validation
    const { yup } = require('@strapi/utils');

    // Register the callout block with a function-based validator
    strapi.customBlocks.register({
      name: 'callout',
      validator: ({ inlineNodeValidator }) => {
        return yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup
            .array()
            .of(inlineNodeValidator)
            .min(1, 'Callout must have at least one child element')
            .required(),
        });
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {},

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
