'use strict';

const { prop, isEmpty, uniq } = require('lodash/fp');
const { hasDraftAndPublish } = require('@strapi/utils').contentTypes;
const { isAnyToMany } = require('@strapi/utils').relations;
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;

const { getService } = require('../utils');
const { validateFindAvailable, validateFindExisting } = require('./validation/relations');
const { isListable } = require('../services/utils/configuration/attributes');

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
    const { entityId, idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const modelSchema = strapi.getModel(model);
    if (!modelSchema) {
      return ctx.badRequest("The model doesn't exist");
    }

    const attribute = modelSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const isComponent = modelSchema.modelType === 'component';

    if (!isComponent) {
      const permissionChecker = getService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }

      if (entityId) {
        const entityManager = getService('entity-manager');

        const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
        const populate = await getService('populate-builder')(model)
          .populateFromQuery(permissionQuery)
          .build();

        const entity = await entityManager.findOne(entityId, model, { populate });

        if (!entity) {
          return ctx.notFound();
        }

        if (permissionChecker.cannot.read(entity, targetField)) {
          return ctx.forbidden();
        }
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (entityId) {
        const entity = await strapi.entityService.findOne(model, entityId);

        if (!entity) {
          return ctx.notFound();
        }
      }
    }

    const targetedModel = strapi.getModel(attribute.target);

    const modelConfig = isComponent
      ? await getService('components').findConfiguration(modelSchema)
      : await getService('content-types').findConfiguration(modelSchema);

    let mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';
    if (!isListable(targetedModel, mainField)) {
      mainField = 'id';
    }

    const fieldsToSelect = uniq(['id', mainField]);
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
      const subQuery = strapi.db.queryBuilder(modelSchema.uid);

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

    const modelSchema = strapi.getModel(model);
    if (!modelSchema) {
      return ctx.badRequest("The model doesn't exist");
    }

    const attribute = modelSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const isComponent = modelSchema.modelType === 'component';

    if (!isComponent) {
      const entityManager = getService('entity-manager');
      const permissionChecker = getService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }

      const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
      const populate = await getService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .build();

      const entity = await entityManager.findOne(id, model, { populate });

      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.read(entity, targetField)) {
        return ctx.forbidden();
      }
    } else {
      const entity = await strapi.entityService.findOne(model, id);

      if (!entity) {
        return ctx.notFound();
      }
    }

    const targetedModel = strapi.getModel(attribute.target);

    const modelConfig = isComponent
      ? await getService('components').findConfiguration(modelSchema)
      : await getService('content-types').findConfiguration(modelSchema);

    let mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';
    if (!isListable(targetedModel, mainField)) {
      mainField = 'id';
    }

    const fieldsToSelect = uniq(['id', mainField]);
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }

    const queryParams = {
      fields: fieldsToSelect,
    };

    if (isAnyToMany(attribute)) {
      const res = await strapi.entityService.loadPages(
        model,
        { id },
        targetField,
        {
          ...queryParams,
          ordering: 'desc',
        },
        {
          page: ctx.request.query.page,
          pageSize: ctx.request.query.pageSize,
        }
      );

      ctx.body = res;
    } else {
      const result = await strapi.entityService.load(model, { id }, targetField, queryParams);
      ctx.body = {
        data: result,
      };
    }
  },
};
