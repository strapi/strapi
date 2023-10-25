'use strict';

const { difference, keys } = require('lodash/fp');
const { mapAsync } = require('@strapi/utils');
const { WORKFLOW_MODEL_UID } = require('../constants/workflows');
const { getWorkflowContentTypeFilter } = require('../utils/review-workflows');

/**
 * @param {Object} oldContentTypes
 * @param {Object} contentTypes
 * @return {Promise<void>}
 */
async function migrateDeletedCTInWorkflows({ oldContentTypes, contentTypes }) {
  const deletedContentTypes = difference(keys(oldContentTypes), keys(contentTypes)) ?? [];

  if (deletedContentTypes.length) {
    await mapAsync(deletedContentTypes, async (deletedContentTypeUID) => {
      const workflow = await strapi.query(WORKFLOW_MODEL_UID).findOne({
        select: ['id', 'contentTypes'],
        where: {
          contentTypes: getWorkflowContentTypeFilter({ strapi }, deletedContentTypeUID),
        },
      });

      if (workflow) {
        await strapi.query(WORKFLOW_MODEL_UID).update({
          where: { id: workflow.id },
          data: {
            contentTypes: workflow.contentTypes.filter(
              (contentTypeUID) => contentTypeUID !== deletedContentTypeUID
            ),
          },
        });
      }
    });
  }
}

module.exports = migrateDeletedCTInWorkflows;
