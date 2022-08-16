'use strict';

const { prop, isEmpty, isNil } = require('lodash/fp');
const { convertFiltersQueryParams } = require('@strapi/utils/lib/convert-query-params');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;

const { getService } = require('../utils');
const { validateFindAvailable } = require('./validation/relations');

module.exports = {
  async findAvailable(ctx) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

    await validateFindAvailable(ctx.request.query);

    const { component, entityId, idsToOmit, page = 1, pageSize = 10, _q } = ctx.request.query;

    const sourceModelUid = component || model;

    const sourceModel = strapi.getModel(sourceModelUid);
    if (!sourceModel) {
      return ctx.badRequest("The model doesn't exist");
    }

    // permission check
    if (entityId) {
      const entityManager = getService('entity-manager');
      const permissionChecker = getService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.read()) {
        return ctx.forbidden();
      }

      const entity = await entityManager.findOneWithCreatorRoles(entityId, model);

      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.read(entity)) {
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
      where: { $and: [] },
      select: fieldsToSelect,
      orderBy: mainField,
      page,
      pageSize,
    };

    if (!isNil(_q)) {
      queryParams._q = _q;
    }

    if (!isNil(ctx.request.query.filters)) {
      queryParams.where.$and.push(
        convertFiltersQueryParams(ctx.request.query.filters, targetedModel).filters
      );
    }

    if (!isEmpty(idsToOmit)) {
      queryParams.where.$and.push({ id: { $notIn: idsToOmit } });
    }

    if (entityId) {
      const subQuery = strapi.db.queryBuilder(sourceModel.uid);

      const alias = subQuery.getAlias();

      const knexSubQuery = subQuery
        .where({ id: entityId })
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      queryParams.where.$and.push({ id: { $notIn: knexSubQuery } });
    }

    const results = await strapi.query(targetedModel.uid).findPage(queryParams);

    ctx.body = {
      results: results.results,
      pagination: {
        page: results.pagination.page,
        pageSize: results.pagination.pageSize,
        total: results.pagination.total,
      },
    };
  },
};
