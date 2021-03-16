'use strict';

const { prop, pipe, pick, mergeAll, map } = require('lodash/fp');
const { getService } = require('../utils');

module.exports = {
  async getNonLocalizedAttributes(ctx) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.request.body;

    const modelDef = strapi.getModel(model);

    const { getNonLocalizedAttributes } = getService('content-types');
    const nonLocalizedFieldsList = getNonLocalizedAttributes(modelDef);

    const permCheckerService = strapi.plugins['content-manager'].services['permission-checker'];
    const permissionChecker = permCheckerService.create({ userAbility, model });

    const entity = await strapi.entityService.findOne({ params: { id } }, { model });

    if (!entity) {
      return ctx.notFound();
    }

    const relatedEntities = await strapi.entityService.find(
      {
        params: { id_in: entity.localizations.map(prop('id')), _locale: 'all' },
      },
      { model }
    );

    const allEntities = [...relatedEntities, entity].filter(entity =>
      permissionChecker.can.read(entity)
    );

    const sanitizedEntities = allEntities.map(entity => permissionChecker.sanitizeOutput(entity));

    const nonLocalizedFields = pipe(map(pick(nonLocalizedFieldsList)), mergeAll)(sanitizedEntities);

    ctx.body = {
      nonLocalizedFields,
      localizations: entity.localizations.concat(pick(['id', 'locale'], entity)),
    };
  },
};
