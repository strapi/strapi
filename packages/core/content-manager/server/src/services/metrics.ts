import { intersection, get } from 'lodash';

import { relations } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';

const { getRelationalFields } = relations;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sendDidConfigureListView = async (
    contentType: Struct.ContentTypeSchema,
    configuration: Configuration
  ) => {
    const displayedFields = get(configuration.layouts.list, 'length');
    const relationalFields = getRelationalFields(contentType);
    const displayedRelationalFields = intersection(
      configuration.layouts.list,
      relationalFields
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
