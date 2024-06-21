/**
 * This hook doesn't use a context provider because we fetch directly from the server,
 * this sounds expensive but actually, it's really not. Because we have redux-toolkit-query
 * being a cache layer so if nothing invalidates the cache, we don't fetch again.
 */

import * as React from 'react';

import {
  useNotification,
  useAPIErrorHandler,
  useQueryParams,
  FormErrors,
  getYupValidationErrors,
} from '@strapi/admin/strapi-admin';
import { Modules } from '@strapi/types';
import { useParams } from 'react-router-dom';
import { ValidationError } from 'yup';

import { SINGLE_TYPES } from '../constants/collections';
import { useGetDocumentQuery } from '../services/documents';
import { buildValidParams } from '../utils/api';
import { createYupSchema } from '../utils/validation';

import { useContentTypeSchema, ComponentsDictionary } from './useContentTypeSchema';

import type { FindOne } from '../../../shared/contracts/collection-types';
import type { ContentType } from '../../../shared/contracts/content-types';

interface UseDocumentArgs {
  collectionType: string;
  model: string;
  documentId?: string;
  params?: object;
}

type UseDocumentOpts = Parameters<typeof useGetDocumentQuery>[1];

type Document = FindOne.Response['data'];

type Schema = ContentType;

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
  meta?: FindOne.Response['meta'];
  isLoading: boolean;
  /**
   * This is the schema of the content type, it is not the same as the layout.
   */
  schema?: Schema;
  validate: (document: Document) => null | FormErrors;
};

/* -------------------------------------------------------------------------------------------------
 * useDocument
 * -----------------------------------------------------------------------------------------------*/

/**
 * @alpha
 * @public
 * @description Returns a document based on the model, collection type & id passed as arguments.
 * Also extracts its schema from the redux cache to be used for creating a validation schema.
 * @example
 * ```tsx
 * const { id, model, collectionType } = useParams<{ id: string; model: string; collectionType: string }>();
 *
 * if(!model || !collectionType) return null;
 *
 * const { document, isLoading, validate } = useDocument({ documentId: id, model, collectionType, params: { locale: 'en-GB' } })
 * const { update } = useDocumentActions()
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
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const {
    currentData: data,
    isLoading: isLoadingDocument,
    isFetching: isFetchingDocument,
    error,
  } = useGetDocumentQuery(args, {
    ...opts,
    skip: (!args.documentId && args.collectionType !== SINGLE_TYPES) || opts?.skip,
  });

  const { components, schema, isLoading: isLoadingSchema } = useContentTypeSchema(args.model);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [toggleNotification, error, formatAPIError, args.collectionType]);

  const validationSchema = React.useMemo(() => {
    if (!schema) {
      return null;
    }

    return createYupSchema(schema.attributes, components);
  }, [schema, components]);

  const validate = React.useCallback(
    (document: Modules.Documents.AnyDocument): FormErrors | null => {
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
          return getYupValidationErrors(error);
        }

        throw error;
      }
    },
    [validationSchema]
  );

  const isLoading = isLoadingDocument || isFetchingDocument || isLoadingSchema;

  return {
    components,
    document: data?.data,
    meta: data?.meta,
    isLoading,
    schema,
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
      { documentId: origin || id, model: slug, collectionType, params },
      {
        skip: id === 'create' || (!origin && !id && collectionType !== SINGLE_TYPES),
      }
    ),
  };
};

export { useDocument, useDoc };
export type { UseDocument, UseDocumentArgs, Document, Schema, ComponentsDictionary };
