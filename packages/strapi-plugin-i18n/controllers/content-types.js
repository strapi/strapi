'use strict';

const { pick, uniq } = require('lodash/fp');
const { getService } = require('../utils');

module.exports = {
  async getNonLocalizedAttributes(ctx) {
    const { userAbility } = ctx.state;
    const { model, id } = ctx.request.body;

    const modelDef = strapi.getModel(model);
    const { copyNonLocalizedAttributes } = getService('content-types');
    const { READ_ACTION, CREATE_ACTION } = strapi.admin.services.constants;

    const entity = await strapi.entityService.findOne({ params: { id } }, { model });

    if (!entity) {
      return ctx.notFound();
    }

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      model,
    });

    const permittedReadFields = pm.permittedFieldsOf(READ_ACTION);
    const permittedCreateFields = pm.permittedFieldsOf(CREATE_ACTION);
    const permittedFields = uniq([...permittedReadFields, ...permittedCreateFields]);

    const nonLocalizedFields = copyNonLocalizedAttributes(modelDef, entity);
    const sanitizedNonLocalizedFields = pick(permittedFields, nonLocalizedFields);

    ctx.body = {
      nonLocalizedFields: sanitizedNonLocalizedFields,
      localizations: entity.localizations.concat(pick(['id', 'locale'], entity)),
    };
  },
};
