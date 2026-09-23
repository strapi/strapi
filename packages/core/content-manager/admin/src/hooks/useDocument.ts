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
  useForm,
} from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { ValidationError } from 'yup';

import { SINGLE_TYPES } from '../constants/collections';
import { type AnyData, transformDocument } from '../pages/EditView/utils/data';
import { createDefaultForm } from '../pages/EditView/utils/forms';
import { useGetDocumentQuery } from '../services/documents';
import { buildValidParams } from '../utils/api';
import { createYupSchema } from '../utils/validation';

import { useContentTypeSchema, ComponentsDictionary } from './useContentTypeSchema';
import { useDocumentLayout } from './useDocumentLayout';

import type { FindOne } from '../../../shared/contracts/collection-types';
import type { ContentType } from '../../../shared/contracts/content-types';
import type { Modules } from '@strapi/types';

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
  schemas?: Schema[];
  hasError?: boolean;
  refetch: () => void;
  validate: (document: Document) => null | FormErrors;
  /**
   * Get the document's title
   */
  getTitle: (mainField: string) => string;
  /**
   * Get the initial form values for the document
   */
  getInitialFormValues: (isCreatingDocument?: boolean) => AnyData | undefined;
};

/**
 * Mirrors the server's `isLocalizedAttribute` in
 * `packages/plugins/i18n/server/src/services/content-types.ts`: an attribute
 * counts as localized only when `pluginOptions.i18n.localized` is explicitly
 * `true`. Both `false` and `undefined` mean "non-localized" — important here
 * because attributes created without the i18n plugin omit the field entirely,
 * and we still want them inherited when creating a new locale draft.
 */
const isLocalizedAttribute = (attribute: { pluginOptions?: object }): boolean => {
  // `pluginOptions` on the base attribute is typed as `object`, so we have to
  // narrow it to the i18n-specific shape here.
  const i18nOptions = attribute.pluginOptions as { i18n?: { localized?: boolean } } | undefined;
  return i18nOptions?.i18n?.localized === true;
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
 */
const useDocument: UseDocument = (args, opts) => {
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { formatMessage } = useIntl();

  const {
    currentData: data,
    isLoading: isLoadingDocument,
    isFetching: isFetchingDocument,
    error,
    refetch,
  } = useGetDocumentQuery(args, {
    ...opts,
    skip: (!args.documentId && args.collectionType !== SINGLE_TYPES) || opts?.skip,
  });
  const document = data?.data;
  const meta = data?.meta;

  const {
    components,
    schema,
    schemas,
    isLoading: isLoadingSchema,
  } = useContentTypeSchema(args.model);
  const isSingleType = schema?.kind === 'singleType';

  const getTitle = React.useCallback(
    (mainField: string) => {
      // Always use mainField if it's not an id
      if (mainField !== 'id' && document?.[mainField]) {
        return document[mainField];
      }

      // When it's a singleType without a mainField, use the contentType displayName
      if (schema?.kind === 'singleType' && schema.info.displayName) {
        return formatMessage({
          id: schema.info.displayName,
          defaultMessage: schema.info.displayName,
        });
      }

      // Otherwise, use a fallback
      return formatMessage({
        id: 'content-manager.containers.untitled',
        defaultMessage: 'Untitled',
      });
    },
    [document, formatMessage, schema]
  );

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

  /**
   * Schema attributes that should be inherited from a sibling locale when
   * creating a new locale draft.
   *
   * Scope intentionally matches what the server populates into
   * `meta.availableLocales` (see `packages/core/content-manager/server/src/services/document-metadata.ts`):
   *   - non-localized — `isLocalizedAttribute` semantics, so attributes whose
   *     `pluginOptions.i18n.localized` is `undefined` count as non-localized
   *     (an attribute created without the i18n plugin has no i18n options at
   *     all but is still inherited at save by `copyNonLocalizedFields`).
   *   - scalar or media — `component` / `dynamiczone` / `relation` are excluded
   *     because the server doesn't populate them in `availableLocales` either,
   *     so there'd be nothing to copy from.
   */
  const nonLocalizedScalarAndMediaFields = React.useMemo(() => {
    if (!schema?.attributes) {
      return [];
    }

    return Object.keys(schema.attributes).filter((name) => {
      const attribute = schema.attributes[name];

      if (isLocalizedAttribute(attribute)) {
        return false;
      }

      return (
        attribute.type !== 'component' &&
        attribute.type !== 'dynamiczone' &&
        attribute.type !== 'relation'
      );
    });
  }, [schema]);

  /**
   * Here we prepare the form for editing, we need to:
   * - remove prohibited fields from the document (passwords | ADD YOURS WHEN THERES A NEW ONE)
   * - swap out count objects on relations for empty arrays
   * - set __temp_key__ on array objects for drag & drop
   *
   * We also prepare the form for new documents, so we need to:
   * - set default values on fields
   * - inherit non-localized scalar/media values from a sibling locale.
   *   Scope is intentionally limited to scalars and media — that is exactly
   *   what the server populates into `meta.availableLocales` (see
   *   `packages/core/content-manager/server/src/services/document-metadata.ts`).
   *   Components, dynamic zones, and relations are not in that payload; the
   *   server fills them at save time via `copyNonLocalizedFields` (in
   *   `packages/core/core/src/services/document-service/internationalization.ts`)
   *   when the new locale row is first created.
   *   Baking the inheritance into `initialValues` here is what lets it survive
   *   `<Form>` re-inits: the `SET_INITIAL_VALUES` effect in
   *   `packages/core/admin/admin/src/components/Form.tsx` re-applies these
   *   values whenever `initialValues` changes (e.g. after a locale switch),
   *   which the previous side-effect-based prefill in `LocalePickerAction`
   *   could not survive on revisits.
   */
  const getInitialFormValues = React.useCallback(
    (isCreatingDocument: boolean = false) => {
      if ((!document && !isCreatingDocument && !isSingleType) || !schema) {
        return undefined;
      }

      /**
       * Check that we have an ID so we know the
       * document has been created in some way.
       */
      if (document?.id) {
        return transformDocument(schema, components)(document);
      }

      let form: AnyData = createDefaultForm(schema, components);

      // Intentionally use `availableLocales[0]`:
      // - The server sorts `getAvailableLocales` with the default locale first
      //   (see `document-metadata.ts`), so index 0 is the canonical inheritance
      //   source. Sibling locales can drift on non-localized fields because the
      //   server only syncs them at locale-creation time, not on subsequent
      //   updates — preferring the default keeps the surfaced values stable.
      // - Avoids coupling this hook to `useGetLocalesQuery` just to find the
      //   default locale.
      const sibling = meta?.availableLocales?.[0] as Record<string, unknown> | undefined;
      if (sibling && nonLocalizedScalarAndMediaFields.length > 0) {
        const inherited = nonLocalizedScalarAndMediaFields.reduce<AnyData>((acc, name) => {
          if (name in sibling) {
            acc[name] = sibling[name];
          }
          return acc;
        }, {});

        form = { ...form, ...inherited };
      }

      return transformDocument(schema, components)(form);
    },
    [
      document,
      isSingleType,
      schema,
      components,
      meta?.availableLocales,
      nonLocalizedScalarAndMediaFields,
    ]
  );

  const isLoading = isLoadingDocument || isFetchingDocument || isLoadingSchema;
  const hasError = !!error;

  return React.useMemo(
    () =>
      ({
        components,
        document,
        meta,
        isLoading,
        hasError,
        schema,
        schemas,
        validate,
        getTitle,
        getInitialFormValues,
        refetch,
      }) satisfies ReturnType<UseDocument>,
    [
      components,
      document,
      meta,
      isLoading,
      hasError,
      schema,
      schemas,
      validate,
      getTitle,
      getInitialFormValues,
      refetch,
    ]
  );
};

/* -------------------------------------------------------------------------------------------------
 * useDoc
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal this hook uses the router to extract the model, collection type & id from the url.
 * therefore, it shouldn't be used outside of the content-manager because it won't work as intended.
 */
const useDoc = (opts?: UseDocumentOpts) => {
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

  const document = useDocument(
    { documentId: origin || id, model: slug, collectionType, params },
    {
      ...opts,
      skip: id === 'create' || (!origin && !id && collectionType !== SINGLE_TYPES) || opts?.skip,
    }
  );

  const returnId = origin || (id === 'create' ? undefined : id);

  return {
    collectionType,
    model: slug,
    id: returnId,
    ...document,
  };
};

/**
 * @public
 * @experimental
 * Content manager context hooks for plugin development.
 * Make sure to use this hook inside the content manager.
 */
const useContentManagerContext = () => {
  const {
    collectionType,
    model,
    id,
    components,
    isLoading: isLoadingDoc,
    schema,
    schemas,
  } = useDoc();

  const layout = useDocumentLayout(model);

  const form = useForm<unknown>('useContentManagerContext', (state) => state);

  const isSingleType = collectionType === SINGLE_TYPES;
  const slug = model;
  const isCreatingEntry = id === 'create';

  useContentTypeSchema();

  const isLoading = isLoadingDoc || layout.isLoading;
  const error = layout.error;

  return {
    error,
    isLoading,

    // Base metadata
    model,
    collectionType,
    id,
    slug,
    isCreatingEntry,
    isSingleType,
    hasDraftAndPublish: schema?.options?.draftAndPublish ?? false,

    // All schema infos
    components,
    contentType: schema,
    contentTypes: schemas,

    // Form state
    form,

    // layout infos
    layout,
  };
};

export { useDocument, useDoc, useContentManagerContext };
export type { UseDocument, UseDocumentArgs, Document, Schema, ComponentsDictionary };
