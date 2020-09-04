'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('strapi-utils');
const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;
const { getDefinitionFromStore } = require('./utils/store-definition');

const getDraftAndPublishMigrationWay = async ({ definition, ORM }) => {
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDef = JSON.parse(_.get(previousDefRow, 'value', null));
  const previousDraftAndPublish = contentTypesUtils.hasDraftAndPublish(previousDef);
  const actualDraftAndPublish = contentTypesUtils.hasDraftAndPublish(definition);

  if (previousDraftAndPublish === actualDraftAndPublish) {
    return 'none';
  }
  if (!previousDraftAndPublish && actualDraftAndPublish) {
    return 'enable';
  }
  if (previousDraftAndPublish && !actualDraftAndPublish) {
    return 'disable';
  }
};

const migrateDraftAndPublish = async ({ definition, ORM, way }) => {
  if (way === 'enable') {
    const now = new Date().toISOString();
    let publishedAtValue = now;
    if (_.get(definition, 'options.timestamps', false)) {
      const createdAtColumn = _.get(definition, 'options.timestamps.0', 'created_at');
      publishedAtValue = ORM.knex.ref(createdAtColumn);
    }
    await ORM.knex(definition.collectionName)
      .update({ [PUBLISHED_AT_ATTRIBUTE]: publishedAtValue })
      .where(PUBLISHED_AT_ATTRIBUTE, null);

    await ORM.knex(definition.collectionName) // in case some created_at were null
      .update({ [PUBLISHED_AT_ATTRIBUTE]: now })
      .where(PUBLISHED_AT_ATTRIBUTE, null);
  } else if (way === 'disable') {
    await ORM.knex(definition.collectionName)
      .delete()
      .where(PUBLISHED_AT_ATTRIBUTE, null);

    // column are automatically deleted in sqlite because the table is recreated
    // for other databases, we need to do it ourselves
    const publishedAtColumnExists = await ORM.knex.schema.hasColumn(
      definition.collectionName,
      PUBLISHED_AT_ATTRIBUTE
    );
    if (definition.client !== 'sqlite3' && publishedAtColumnExists) {
      await ORM.knex.schema.table(definition.collectionName, table => {
        table.dropColumn(PUBLISHED_AT_ATTRIBUTE);
      });
    }
  }
};

module.exports = {
  getDraftAndPublishMigrationWay,
  migrateDraftAndPublish,
};
