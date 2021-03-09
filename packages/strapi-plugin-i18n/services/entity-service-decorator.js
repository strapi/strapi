'use strict';

const { getService } = require('../utils');

module.exports = {
  decorate() {
    strapi.entityService.decorate(entityServiceDecorator);
  },
};

const entityServiceDecorator = service => ({
  async create(params, ctx) {
    const model = strapi.db.getModel(ctx.model);
    const entry = await service.create(params, ctx);

    if (getService('content-types').isLocalized(model)) {
      await getService('localizations').syncLocalizations(entry, { model });
    }

    return entry;
  },

  /**
   * Updates an entry & update related localizations fields
   * @param {obj} params - query params
   * @param {obj} ctx - query context (model)
   */
  async update(params, ctx) {
    const model = strapi.db.getModel(ctx.model);
    const entry = await service.update(params, ctx);

    if (getService('content-types').isLocalized(model)) {
      await getService('localizations').updateNonLocalizedFields(entry, { model });
    }

    return entry;
  },
});
