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

interface Entity {
  id: string;
  [key: string]: Attribute.GetValue<Attribute.Any>;
}

interface UseDocumentArgs {
  collectionType: string;
  model: string;
  id?: string;
  params?: object;
}

type UseDocument = (args: UseDocumentArgs) => {
  document?: Contracts.CollectionTypes.FindOne.Response;
  isLoading: boolean;
  validate: (entity: Entity) => null | Record<string, TranslationMessage>;
};

/**
 * @alpha
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
 * const onSubmit = async (entity: Entity) => {
 *  const errors = validate(entity);
 *
 *  if(errors) {
 *      // handle errors
 *  }
 *
 *  await update({ collectionType, model, id }, entity)
 * }
 * ```
 */
const useDocument: UseDocument = (args) => {
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data: document, isLoading: isLoadingDocument, error } = useGetDocumentQuery(args);
  const {
    components,
    contentType,
    isLoading: isLoadingSchema,
  } = useGetInitialDataQuery(undefined, {
    selectFromResult: (res) => ({
      isLoading: res.isLoading,
      components: res.data?.components,
      contentType: res.data?.contentTypes.find((ct) => ct.uid === args.model),
    }),
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

    const componentsByKey = components?.reduce<Record<string, Contracts.Components.Component>>(
      (acc, component) => {
        acc[component.uid] = component;

        return acc;
      },
      {}
    );

    return createYupSchema(contentType.attributes, componentsByKey);
  }, [contentType, components]);

  const validate = (entry: Entity) => {
    if (!validationSchema) {
      throw new Error(
        'There is no validation schema generated, this is likely due to the schema not being loaded yet.'
      );
    }

    try {
      validationSchema.validateSync(entry, { abortEarly: false });

      return null;
    } catch (error) {
      if (error instanceof ValidationError) {
        return getYupInnerErrors(error);
      }

      throw error;
    }
  };

  return {
    document,
    isLoading: isLoadingDocument || isLoadingSchema,
    validate,
  } satisfies ReturnType<UseDocument>;
};

/**
 * @internal this hook uses the router to extract the model, collection type & id from the url.
 * therefore, it shouldn't be used outside of the content-manager because it won't work as intended.
 */
const useDoc = () => {
  const { id, slug, collectionType } = useParams<{
    id: string;
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

  return useDocument({ id, model: slug, collectionType, params });
};

export { useDocument, useDoc };
export type { UseDocument, UseDocumentArgs };
