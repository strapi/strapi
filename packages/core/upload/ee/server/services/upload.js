'use strict';

const _ = require('lodash');

const { FILE_MODEL_UID } = require('../../../server/constants');

const original = require('../../../server/services/upload');

module.exports = ({ strapi }) => {
  const originalService = original({ strapi });

  return Object.assign(originalService, {
    async sendMediaMetrics(action, data) {
      try {
        const totalCount = await strapi.entityService.count(FILE_MODEL_UID);

        const eventProperties = {
          totalCount,
          hasCaption: _.has(data, 'caption') && !_.isEmpty(data.caption),
          hasAlternativeText: _.has(data, 'alternativeText') && !_.isEmpty(data.alternativeText),
        };

        if (action === 'add') {
          strapi.telemetry.send('didUploadFile', {
            eventProperties,
          });
        }

        if (action === 'remove') {
          eventProperties.totalCount -= eventProperties.totalCount;

          strapi.telemetry.send('didDeleteFile', {
            eventProperties,
          });
        }
      } catch (e) {
        // Silent error.
      }
    },
  });
};
