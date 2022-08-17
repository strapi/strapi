'use strict';

const { prop, isEmpty, defaultsDeep } = require('lodash/fp');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;
const { transformParamsToQuery } = require('@strapi/utils/lib/convert-query-params');

const { getService } = require('../utils');
const { validateFindAvailable } = require('./validation/relations');

const addWhereClause = (params, whereClause) => {
  params.where = params.where || {};
  if (params.where.$and) {
    params.where.$and.push(whereClause);
  } else {
    params.where.$and = [whereClause];
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

    // TODO: for RBAC reasons, find a way to exclude filters that should not be there
    // i.e. all filters except locale for i18n
    const queryParams = defaultsDeep(
      {
        orderBy: mainField,
      },
      {
        ...transformParamsToQuery(targetedModel.uid, query),
        select: fieldsToSelect, // cannot select other fields as the user may not have the permissions
      }
    );

    if (!isEmpty(idsToOmit)) {
      addWhereClause(queryParams, { id: { $notIn: idsToOmit } });
    }

    // searching should be allowed only on mainField for permission reasons
    if (_q) {
      addWhereClause(queryParams, { [mainField]: { $containsi: _q } });
    }

    if (entityId) {
      const subQuery = strapi.db.queryBuilder(sourceModel.uid);

      const alias = subQuery.getAlias();

      const knexSubQuery = subQuery
        .where({ id: entityId })
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      addWhereClause(queryParams, { id: { $notIn: knexSubQuery } });
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
