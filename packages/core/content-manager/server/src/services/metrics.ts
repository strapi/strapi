import fp from 'lodash/fp.js';
import { relations } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';

const { intersection, prop } = fp;

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

    strapi.telemetry.send('didConfigureListView', data).catch(() => {});
  };

  return {
    sendDidConfigureListView,
  };
};
