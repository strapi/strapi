'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('strapi-utils');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

const getDraftAndPublishMigrationWay = async ({ definition, previousDefinition }) => {
  const previousDraftAndPublish = contentTypesUtils.hasDraftAndPublish(previousDefinition);
  const actualDraftAndPublish = contentTypesUtils.hasDraftAndPublish(definition);

  if (!previousDefinition || previousDraftAndPublish === actualDraftAndPublish) {
    return 'none';
  }
  if (!previousDraftAndPublish && actualDraftAndPublish) {
    return 'enable';
  }
  if (previousDraftAndPublish && !actualDraftAndPublish) {
    return 'disable';
  }
};

const migrateDraftAndPublish = async ({ definition, previousDefinition, model }) => {
  let way = await getDraftAndPublishMigrationWay({ definition, previousDefinition });

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
  before: migrateDraftAndPublish,
};
