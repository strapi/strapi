/**
 * This hook doesn't use a context provider because we fetch directly from the server,
 * this sounds expensive but actually, it's really not. Because we have redux-toolkit-query
 * being a cache layer so if nothing invalidates the cache, we don't fetch again.
 */

import * as React from 'react';

import {
  TranslationMessage,
  getYupInnerErrors,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
} from '@strapi/helper-plugin';
import { useParams } from 'react-router-dom';
import { ValidationError } from 'yup';

import { useGetDocumentQuery } from '../services/documents';
import { useGetInitialDataQuery } from '../services/init';
import { buildValidParams } from '../utils/api';
import { createYupSchema } from '../utils/validation';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute } from '@strapi/types';

interface UseDocumentArgs {
  collectionType: string;
  model: string;
  id?: string;
  params?: object;
}

type UseDocumentOpts = Parameters<typeof useGetDocumentQuery>[1];

type ComponentsDictionary = Record<string, Contracts.Components.Component>;

type Document = Contracts.CollectionTypes.FindOne.Response['data'];

type Schema = Contracts.ContentTypes.ContentType;

type UseDocument = (
  args: UseDocumentArgs,
  opts?: UseDocumentOpts
) => {
  /**
   * These are the schemas of the components used in the content type, organised
   * by their uid.
   */
  components: ComponentsDictionary;
  document?: Document;
  meta?: Contracts.CollectionTypes.FindOne.Response['meta'];
  isLoading: boolean;
  /**
   * This is the schema of the content type, it is not the same as the layout.
   */
  schema?: Schema;
  validate: (document: Document) => null | Record<string, TranslationMessage>;
};

/* -------------------------------------------------------------------------------------------------
 * useDocument
 * -----------------------------------------------------------------------------------------------*/

/**
 * @alpha
 * @public
 * @description Returns a document based on the model, collection type & id passed as arguments.
 * Also extracts it's schema from the redux cache to be used for creating a validation schema.
 * @example
 * ```tsx
 * const { id, model, collectionType } = useParams<{ id: string; model: string; collectionType: string }>();
 *
 * if(!model || !collectionType) return null;
 *
 * const { document, isLoading, validate } = useDocument({ id, model, collectionType, params: { locale: 'en-GB' } })
 * const { update } = useDocumentOperations()
 *
 * const onSubmit = async (document: Document) => {
 *  const errors = validate(document);
 *
 *  if(errors) {
 *      // handle errors
 *  }
 *
 *  await update({ collectionType, model, id }, document)
 * }
 * ```
 *
 * @see {@link https://contributor.strapi.io/docs/core/content-manager/hooks/use-document} for more information
 */
const useDocument: UseDocument = (args, opts) => {
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, isLoading: isLoadingDocument, error } = useGetDocumentQuery(args, opts);
  const {
    components,
    contentType,
    isLoading: isLoadingSchema,
  } = useGetInitialDataQuery(undefined, {
    selectFromResult: (res) => {
      const contentType = res.data?.contentTypes.find((ct) => ct.uid === args.model);

      const componentsByKey = res.data?.components.reduce<ComponentsDictionary>(
        (acc, component) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      const components = extractContentTypeComponents(contentType?.attributes, componentsByKey);

      return {
        isLoading: res.isLoading,
        components: components,
        contentType,
      };
    },
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [toggleNotification, error, formatAPIError]);

  const validationSchema = React.useMemo(() => {
    if (!contentType) {
      return null;
    }

    return createYupSchema(contentType.attributes, components);
  }, [contentType, components]);

  const validate = React.useCallback(
    (document: Document) => {
      if (!validationSchema) {
        throw new Error(
          'There is no validation schema generated, this is likely due to the schema not being loaded yet.'
        );
      }

      try {
        validationSchema.validateSync(document, { abortEarly: false, strict: true });

        return null;
      } catch (error) {
        if (error instanceof ValidationError) {
          return getYupInnerErrors(error);
        }

        throw error;
      }
    },
    [validationSchema]
  );

  const isLoading = isLoadingDocument || isLoadingSchema;

  return {
    components,
    document: data?.data,
    meta: data?.meta,
    isLoading,
    schema: contentType,
    validate,
  } satisfies ReturnType<UseDocument>;
};

/* -------------------------------------------------------------------------------------------------
 * useDoc
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal this hook uses the router to extract the model, collection type & id from the url.
 * therefore, it shouldn't be used outside of the content-manager because it won't work as intended.
 */
const useDoc = () => {
  const { id, slug, collectionType, origin } = useParams<{
    id: string;
    origin: string;
    slug: string;
    collectionType: string;
  }>();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  if (!collectionType) {
    throw new Error('Could not find collectionType in url params');
  }

  if (!slug) {
    throw new Error('Could not find model in url params');
  }

  return {
    collectionType,
    model: slug,
    id: origin || id === 'create' ? undefined : id,
    ...useDocument(
      { id: origin || id, model: slug, collectionType, params },
      {
        skip: id === 'create',
      }
    ),
  };
};

/* -------------------------------------------------------------------------------------------------
 * extractContentTypeComponents
 * -----------------------------------------------------------------------------------------------*/

const extractContentTypeComponents = (
  attributes: Contracts.ContentTypes.ContentType['attributes'] = {},
  allComponents: ComponentsDictionary = {}
): ComponentsDictionary => {
  const getComponents = (attributes: Attribute.Any[]) => {
    return attributes.reduce<string[]>((acc, attribute) => {
      /**
       * If the attribute is a component or dynamiczone, we need to recursively
       * extract the component UIDs from it's attributes.
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

export { useDocument, useDoc };
export type { UseDocument, UseDocumentArgs, Document, Schema, ComponentsDictionary };
