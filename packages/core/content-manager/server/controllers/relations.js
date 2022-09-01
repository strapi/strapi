'use strict';

const { prop, isEmpty } = require('lodash/fp');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;
const { MANY_RELATIONS } = require('@strapi/utils').relations.constants;

const { getService } = require('../utils');
const { validateFindAvailable, validateFindExisting } = require('./validation/relations');

const addFiltersClause = (params, filtersClause) => {
  params.filters = params.filters || {};
  if (params.filters.$and) {
    params.filters.$and.push(filtersClause);
  } else {
    params.filters.$and = [filtersClause];
  }
};

module.exports = {
  async findAvailable(ctx) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

    await validateFindAvailable(ctx.request.query);

    const { component, entityId, idsToOmit, _q, ...query } = ctx.request.query;

    const sourceModelUid = component || model;

    const sourceModel = strapi.getModel(sourceModelUid);
    if (!sourceModel) {
      return ctx.badRequest("The model doesn't exist");
    }

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model,
    });

    if (!component && permissionChecker.cannot.read(null, targetField)) {
      return ctx.forbidden();
    }
    // TODO: find a way to check field permission for component
    if (component && permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    if (entityId) {
      const entityManager = getService('entity-manager');

      const entity = await entityManager.findOneWithCreatorRoles(entityId, model);

      if (!entity) {
        return ctx.notFound();
      }

      if (!component && permissionChecker.cannot.read(entity, targetField)) {
        return ctx.forbidden();
      }
      // TODO: find a way to check field permission for component
      if (component && permissionChecker.cannot.read(entity)) {
        return ctx.forbidden();
      }
    }

    const attribute = sourceModel.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const targetedModel = strapi.getModel(attribute.target);

    const modelConfig = component
      ? await getService('components').findConfiguration(sourceModel)
      : await getService('content-types').findConfiguration(sourceModel);
    const mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';

    const fieldsToSelect = ['id', mainField];
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }

    const queryParams = {
      sort: mainField,
      ...query,
      fields: fieldsToSelect, // cannot select other fields as the user may not have the permissions
      filters: {}, // cannot filter for RBAC reasons
    };

    if (!isEmpty(idsToOmit)) {
      addFiltersClause(queryParams, { id: { $notIn: idsToOmit } });
    }

    // searching should be allowed only on mainField for permission reasons
    if (_q) {
      addFiltersClause(queryParams, { [mainField]: { $containsi: _q } });
    }

    if (entityId) {
      const subQuery = strapi.db.queryBuilder(sourceModel.uid);

      const alias = subQuery.getAlias();

      const knexSubQuery = subQuery
        .where({ id: entityId })
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      addFiltersClause(queryParams, { id: { $notIn: knexSubQuery } });
    }

    ctx.body = await strapi.entityService.findPage(targetedModel.uid, queryParams);
  },

  async findExisting(ctx) {
    const { userAbility } = ctx.state;
    const { model, id, targetField } = ctx.params;

    await validateFindExisting(ctx.request.query);

    const { component, idsToOmit, _q, ...query } = ctx.request.query;

    const sourceModelUid = component || model;

    const sourceModel = strapi.getModel(sourceModelUid);
    if (!sourceModel) {
      return ctx.badRequest("The model doesn't exist");
    }

    const entityManager = getService('entity-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model,
    });

    if (!component && permissionChecker.cannot.read(null, targetField)) {
      return ctx.forbidden();
    }
    // TODO: find a way to check field permission for component
    if (component && permissionChecker.cannot.read(null)) {
      return ctx.forbidden();
    }

    const entity = await entityManager.findOneWithCreatorRoles(id, model);

    if (!entity) {
      return ctx.notFound();
    }

    if (!component && permissionChecker.cannot.read(entity, targetField)) {
      return ctx.forbidden();
    }
    // TODO: find a way to check field permission for component
    if (component && permissionChecker.cannot.read(entity)) {
      return ctx.forbidden();
    }

    const attribute = sourceModel.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const targetedModel = strapi.getModel(attribute.target);

    const modelConfig = component
      ? await getService('components').findConfiguration(sourceModel)
      : await getService('content-types').findConfiguration(sourceModel);
    const mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';

    const fieldsToSelect = ['id', mainField];
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }

    const queryParams = {
      sort: mainField,
      ...query,
      fields: fieldsToSelect, // cannot select other fields as the user may not have the permissions
      filters: {}, // cannot filter for RBAC reasons
    };

    if (!isEmpty(idsToOmit)) {
      addFiltersClause(queryParams, { id: { $notIn: idsToOmit } });
    }

    // searching should be allowed only on mainField for permission reasons
    if (_q) {
      addFiltersClause(queryParams, { [mainField]: { $containsi: _q } });
    }

    const subQuery = strapi.db.queryBuilder(sourceModel.uid);

    const alias = subQuery.getAlias();

    const knexSubQuery = subQuery
      .where({ id })
      .join({ alias, targetField })
      .select(`${alias}.id`)
      .getKnexQuery();

    addFiltersClause(queryParams, { id: { $in: knexSubQuery } });

    if (MANY_RELATIONS.includes(attribute.relation)) {
      ctx.body = await strapi.entityService.findPage(targetedModel.uid, queryParams);
    } else {
      const results = await strapi.entityService.findMany(targetedModel.uid, queryParams);
      ctx.body = results[0];
    }
  },
};
