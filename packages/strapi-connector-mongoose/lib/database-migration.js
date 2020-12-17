'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('strapi-utils');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;
const { getDefinitionFromStore } = require('./utils/store-definition');

const getDraftAndPublishMigrationWay = async (definition, ORM) => {
  const previousDefRow = await getDefinitionFromStore(definition, ORM);
  const previousDef = JSON.parse(_.get(previousDefRow, 'value', null));
  const previousDraftAndPublish = contentTypesUtils.hasDraftAndPublish(previousDef);
  const actualDraftAndPublish = contentTypesUtils.hasDraftAndPublish(definition);

  if (!previousDefRow || previousDraftAndPublish === actualDraftAndPublish) {
    return 'none';
  }
  if (!previousDraftAndPublish && actualDraftAndPublish) {
    return 'enable';
  }
  if (previousDraftAndPublish && !actualDraftAndPublish) {
    return 'disable';
  }
};

const migrateDraftAndPublish = async ({ definition, model, ORM }) => {
  let way = await getDraftAndPublishMigrationWay(definition, ORM);

  if (way === 'enable') {
    const createdAtCol = _.get(definition, 'timestamps.createdAt', 'createdAt');
    await model
      .aggregate([
        {
          $addFields: {
            [PUBLISHED_AT_ATTRIBUTE]: { $ifNull: [`$${createdAtCol}`, new Date()] },
          },
        },
        {
          $out: definition.collectionName,
        },
      ])
      .exec();
  } else if (way === 'disable') {
    await model.deleteMany({ [PUBLISHED_AT_ATTRIBUTE]: null });
    await model.updateMany({}, { $unset: { [PUBLISHED_AT_ATTRIBUTE]: '' } }, { strict: false });
  }
};

module.exports = {
  migrateDraftAndPublish,
};
