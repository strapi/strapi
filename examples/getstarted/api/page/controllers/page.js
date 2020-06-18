'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async updateMany(ctx) {
        const entity = await strapi.services.page.editMany(
            ctx.params,
            ctx.request.body,
        );

        return sanitizeEntity(entity, { model: strapi.models.page });
    },
};