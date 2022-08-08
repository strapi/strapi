'use strict';

const { pick, uniq, prop, getOr, flatten, pipe, map } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const { validateGetNonLocalizedAttributesInput } = require('../validation/content-types');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

const getLocalesProperty = getOr([], 'properties.locales');
const getFieldsProperty = prop('properties.fields');

const getFirstLevelPath = map(path => path.split('.')[0]);

module.exports = {
  async getNonLocalizedAttributes(ctx) {
    const { user } = ctx.state;
    const { model, id, locale } = ctx.request.body;

    await validateGetNonLocalizedAttributesInput({ model, id, locale });

    const {
      copyNonLocalizedAttributes,
      isLocalizedContentType,
      getNestedPopulateOfNonLocalizedAttributes,
    } = getService('content-types');
    const { READ_ACTION, CREATE_ACTION } = strapi.admin.services.constants;

    const modelDef = strapi.contentType(model);
    const attributesToPopulate = getNestedPopulateOfNonLocalizedAttributes(model);

    if (!isLocalizedContentType(modelDef)) {
      throw new ApplicationError('model.not.localized');
    }

    const params = modelDef.kind === 'singleType' ? {} : { id };

    const entity = await strapi
      .query(model)
      .findOne({ where: params, populate: [...attributesToPopulate, 'localizations'] });

    if (!entity) {
      return ctx.notFound();
    }

    const permissions = await strapi.admin.services.permission.findMany({
      where: {
        action: [READ_ACTION, CREATE_ACTION],
        subject: model,
        role: {
          id: user.roles.map(prop('id')),
        },
      },
    });

    const localePermissions = permissions
      .filter(perm => getLocalesProperty(perm).includes(locale))
      .map(getFieldsProperty);

    const permittedFields = pipe(flatten, getFirstLevelPath, uniq)(localePermissions);

    const nonLocalizedFields = copyNonLocalizedAttributes(modelDef, entity);
    const sanitizedNonLocalizedFields = pick(permittedFields, nonLocalizedFields);

    ctx.body = {
      nonLocalizedFields: sanitizedNonLocalizedFields,
      localizations: entity.localizations.concat(
        pick(['id', 'locale', PUBLISHED_AT_ATTRIBUTE], entity)
      ),
    };
  },
};
