'use strict';

const { prop, isEmpty } = require('lodash/fp');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const { isAnyToMany } = require('@strapi/utils').relations;
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;

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

    // idsToOmit: used to exclude relations that the front already added but that were not saved yet
    // idsToInclude: used to include relations that the front removed but not saved yes
    const { component, entityId, idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const sourceModelUid = component || model;

    const sourceModel = strapi.getModel(sourceModelUid);
    if (!sourceModel) {
      return ctx.badRequest("The model doesn't exist");
    }

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model,
    });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const attribute = sourceModel.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    // TODO: find a way to check field permission for component
    if (!component && permissionChecker.cannot.read(null, targetField)) {
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

      const where = {
        id: entityId,
        [`${alias}.id`]: { $notNull: true },
      };

      if (!isEmpty(idsToInclude)) {
        where[`${alias}.id`].$notIn = idsToInclude;
      }

      const knexSubQuery = subQuery
        .where(where)
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

    const { component, ...query } = ctx.request.query;

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

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const attribute = sourceModel.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    // TODO: find a way to check field permission for component
    if (!component && permissionChecker.cannot.read(null, targetField)) {
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
      fields: fieldsToSelect,
    };

    if (isAnyToMany(attribute)) {
      const res = await strapi.entityService.loadPages(sourceModelUid, { id }, targetField, {
        ...queryParams,
        page: query.page,
        pageSize: query.pageSize,
        ordering: 'desc',
      });

      ctx.body = res;
    } else {
      const result = await strapi.entityService.load(
        sourceModelUid,
        { id },
        targetField,
        queryParams
      );
      // const result = await strapi.db.query(sourceModelUid).load({ id }, targetField, queryParams);
      // TODO: Temporary fix (use data instead)
      ctx.body = {
        results: result ? [result] : [],
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
      };
    }
  },
};
