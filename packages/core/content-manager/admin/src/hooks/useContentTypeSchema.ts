import * as React from 'react';

import { useNotification, useAPIErrorHandler } from '@strapi/admin/strapi-admin';

import { useGetInitialDataQuery } from '../services/init';

import type { Component } from '../../../shared/contracts/components';
import type { ContentType } from '../../../shared/contracts/content-types';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * useContentTypeSchema
 * -----------------------------------------------------------------------------------------------*/
type ComponentsDictionary = Record<string, Component>;

/**
 * @internal
 * @description Given a model UID, return the schema and the schemas
 * of the associated components within said model's schema. A wrapper
 * implementation around the `useGetInitialDataQuery` with a unique
 * `selectFromResult` function to memoize the calculation.
 *
 * If no model is provided, the hook will return all the schemas.
 */
const useContentTypeSchema = (model?: string) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, error, isLoading, isFetching } = useGetInitialDataQuery(undefined);

  const { components, contentType, contentTypes } = React.useMemo(() => {
    const contentType = data?.contentTypes.find((ct) => ct.uid === model);

    const componentsByKey = data?.components.reduce<ComponentsDictionary>((acc, component) => {
      acc[component.uid] = component;

      return acc;
    }, {});

    const components = extractContentTypeComponents(contentType?.attributes, componentsByKey);

    return {
      components: Object.keys(components).length === 0 ? undefined : components,
      contentType,
      contentTypes: data?.contentTypes ?? [],
    };
  }, [model, data]);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [toggleNotification, error, formatAPIError]);

  return {
    // This must be memoized to avoid inifiinite re-renders where the empty object is different everytime.
    components: React.useMemo(() => components ?? {}, [components]),
    schema: contentType,
    schemas: contentTypes,
    isLoading: isLoading || isFetching,
  };
};

/* -------------------------------------------------------------------------------------------------
 * extractContentTypeComponents
 * -----------------------------------------------------------------------------------------------*/
/**
 * @internal
 * @description Extracts the components used in a content type's attributes recursively.
 */
const extractContentTypeComponents = (
  attributes: ContentType['attributes'] = {},
  allComponents: ComponentsDictionary = {}
): ComponentsDictionary => {
  const getComponents = (attributes: Schema.Attribute.AnyAttribute[]) => {
    return attributes.reduce<string[]>((acc, attribute) => {
      /**
       * If the attribute is a component or dynamiczone, we need to recursively
       * extract the component UIDs from its attributes.
       */
      if (attribute.type === 'component') {
        const componentAttributes = Object.values(
          allComponents[attribute.component]?.attributes ?? {}
        );

        acc.push(attribute.component, ...getComponents(componentAttributes));
      } else if (attribute.type === 'dynamiczone') {
        acc.push(
          ...attribute.components,
          /**
           * Dynamic zones have an array of components, so we flatMap over them
           * performing the same search as above.
           */
          ...attribute.components.flatMap((componentUid) => {
            const componentAttributes = Object.values(
              allComponents[componentUid]?.attributes ?? {}
            );

            return getComponents(componentAttributes);
          })
        );
      }

      return acc;
    }, []);
  };

  const componentUids = getComponents(Object.values(attributes));

  const uniqueComponentUids = [...new Set(componentUids)];

  const componentsByKey = uniqueComponentUids.reduce<ComponentsDictionary>((acc, uid) => {
    acc[uid] = allComponents[uid];

    return acc;
  }, {});

  return componentsByKey;
};

export { useContentTypeSchema, extractContentTypeComponents };
export type { ComponentsDictionary };
