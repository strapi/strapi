import get from 'lodash/get';

import type { ContentType, Components, Component } from '../../../types';
import type { Internal } from '@strapi/types';

export const createModifiedDataSchema = (
  contentTypeSchema: ContentType | Component,
  retrievedComponents: Internal.UID.Component[],
  allComponentsSchema: Components,
  isInContentTypeView: boolean
) => {
  const componentsAssociatedToContentType = retrievedComponents.reduce((acc: any, current) => {
    const componentSchema = get(allComponentsSchema, current, {});

    acc[current] = componentSchema;

    return acc;
  }, {});
  const keyName = isInContentTypeView ? 'contentType' : 'component';
  const schema = {
    [keyName]: contentTypeSchema,
    components: componentsAssociatedToContentType,
  };

  return schema;
};
