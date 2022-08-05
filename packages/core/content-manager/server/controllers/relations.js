'use strict';

const { prop, isEmpty } = require('lodash/fp');
const { PUBLISHED_AT_ATTRIBUTE } = require('@strapi/utils').contentTypes.constants;

const { getService } = require('../utils');
const { validateFindNew } = require('./validation/relations');

module.exports = {
  async findNew(ctx) {
    const { model, targetField } = ctx.params;

    await validateFindNew(ctx.request.query);

    const { component, entityId, idsToOmit, page = 1, pageSize = 10, q } = ctx.request.query;

    const sourceModel = component || model;

    const modelDef = strapi.getModel(sourceModel);
    if (!modelDef) {
      return ctx.badRequest("The model doesn't exist");
    }

    const attribute = modelDef.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const targetedModel = strapi.getModel(attribute.target);

    const offset = Math.max(page - 1, 0) * pageSize;
    const limit = Number(pageSize);

    const modelConfig = component
      ? await getService('components').findConfiguration(modelDef)
      : await getService('content-types').findConfiguration(modelDef);
    const mainField = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';

    const query = strapi.db.queryBuilder(targetedModel.uid);

    if (q) {
      query.search(q);
    }

    if (!isEmpty(idsToOmit)) {
      query.where({ id: { $notIn: idsToOmit } });
    }

    if (entityId) {
      const joinTable = strapi.db.metadata.get(sourceModel).attributes[targetField].joinTable;
      const sourceColumn = component ? joinTable.joinColumn.name : joinTable.inverseJoinColumn.name;
      const targetColumn = component ? joinTable.inverseJoinColumn.name : joinTable.joinColumn.name;

      // Select ids of targeted entities already having a relation with _entityId
      const knexSubQuery = strapi.db
        .queryBuilder(joinTable.name)
        .select([targetColumn])
        .where({ [sourceColumn]: entityId })
        .getKnexQuery();

      query.where({ id: { $notIn: knexSubQuery } });
    }

    const { count } = await query
      .clone()
      .count()
      .first()
      .execute();
    const entities = await query
      .select([mainField, 'id', PUBLISHED_AT_ATTRIBUTE])
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
