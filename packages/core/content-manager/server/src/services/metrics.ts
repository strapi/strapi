import { intersection, prop } from 'lodash/fp';
import { relations } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';

const { getRelationalFields } = relations;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sendDidConfigureListView = async (
    contentType: Struct.ContentTypeSchema,
    configuration: Configuration
  ) => {
    const displayedFields = prop('length', configuration.layouts.list);
    const relationalFields = getRelationalFields(contentType);
    const displayedRelationalFields = intersection(
      relationalFields,
      configuration.layouts.list
    ).length;

    const data = {
      eventProperties: { containsRelationalFields: !!displayedRelationalFields },
    };

    if (data.eventProperties.containsRelationalFields) {
      Object.assign(data.eventProperties, {
        displayedFields,
        displayedRelationalFields,
      });
    }

    try {
      await strapi.telemetry.send('didConfigureListView', data);
    } catch (e) {
      // silence
    }
  };

  return {
    sendDidConfigureListView,
  };
};
