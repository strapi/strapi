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

    const offset = Math.max(page - 1, 0) * pageSize;
    const limit = Number(pageSize);

    const modelConfig = component
      ? await getService('components').findConfiguration(sourceModel)
      : await getService('content-types').findConfiguration(sourceModel);
    const mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';

    const query = strapi.db.queryBuilder(targetedModel.uid);

    if (!isNil(_q)) {
      query.search(_q);
    }

    if (!isNil(ctx.request.query.filters)) {
      query.where(convertFiltersQueryParams(ctx.request.query.filters, targetedModel));
    }

    if (!isEmpty(idsToOmit)) {
      query.where({ id: { $notIn: idsToOmit } });
    }

    if (entityId) {
      const subQuery = strapi.db.queryBuilder(sourceModel.uid);

      const alias = subQuery.getAlias();

      const knexSubQuery = subQuery
        .where({ id: entityId })
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      query.where({ id: { $notIn: knexSubQuery } });
    }

    const { count } = await query.clone().count().first().execute();

    const fieldsToSelect = ['id', mainField];
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }
    const entities = await query
      .select(fieldsToSelect)
      .orderBy(mainField)
      .offset(offset)
      .limit(limit)
      .execute();

    ctx.body = {
      results: entities,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: count,
      },
    };
  },
};
