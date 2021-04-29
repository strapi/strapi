'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('strapi-utils');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

const getDraftAndPublishMigrationWay = async ({ definition, previousDefinition }) => {
  const previousDraftAndPublish = contentTypesUtils.hasDraftAndPublish(previousDefinition);
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

const before = async ({ definition, previousDefinition, ORM }, context) => {
  const way = await getDraftAndPublishMigrationWay({ definition, previousDefinition });

  if (way === 'disable') {
    const publishedAtColumnExists = await ORM.knex.schema.hasColumn(
      definition.collectionName,
      PUBLISHED_AT_ATTRIBUTE
    );

    if (publishedAtColumnExists) {
      await ORM.knex(definition.collectionName)
        .delete()
        .where(PUBLISHED_AT_ATTRIBUTE, null);

      if (definition.client === 'sqlite3') {
        // Bug when dropping column with sqlite3 https://github.com/knex/knex/issues/631
        // Need to recreate the table
        context.recreateSqliteTable = true;
      } else {
        await ORM.knex.schema.table(definition.collectionName, table => {
          table.dropColumn(PUBLISHED_AT_ATTRIBUTE);
        });
      }
    }
  }
};

const after = async ({ definition, previousDefinition, ORM }) => {
  const way = await getDraftAndPublishMigrationWay({ definition, previousDefinition });

  if (way === 'enable') {
    const now = new Date();
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
  }
};

module.exports = {
  before,
  after,
};
