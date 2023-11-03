import { intersection, prop } from 'lodash/fp';
import { relations } from '@strapi/utils';
const { getRelationalFields } = relations;

export default ({ strapi }: any) => {
  const sendDidConfigureListView = async (contentType: any, configuration: any) => {
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
