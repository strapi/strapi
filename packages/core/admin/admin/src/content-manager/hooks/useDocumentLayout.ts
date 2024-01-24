import * as React from 'react';

import { SerializedError } from '@reduxjs/toolkit';
import {
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useStrapiApp,
} from '@strapi/helper-plugin';

import { HOOKS } from '../../constants';
import { useTypedSelector } from '../../core/store/hooks';
import { BaseQueryError } from '../../utils/baseQuery';
import { selectSchemas } from '../layout';
import { useGetContentTypeConfigurationQuery } from '../services/contentTypes';
import { formatLayouts } from '../utils/layouts';

import { ComponentsDictionary, Schema, useDocument } from './useDocument';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute } from '@strapi/types';

interface FieldLayout {
  /**
   * translated from the editable property of an attribute's metadata
   */
  disabled?: boolean;
  /**
   * translated from the description property of an attribute's metadata
   */
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  size: number;
  type: Attribute.Kind;
  unique?: boolean;
  visible?: boolean;
}

interface EditLayout {
  schema: Array<Array<FieldLayout[]>>;
  components: {
    [uid: string]: Array<FieldLayout[]>;
  };
}

type UseDocumentLayout = (model: string) => {
  error?: BaseQueryError | SerializedError;
  isLoading: boolean;
  /**
   * This is the layout for the edit view,
   */
  edit: EditLayout;
};

const DEFAULT_LAYOUT = {
  schema: [],
  components: {},
} satisfies EditLayout;

/* -------------------------------------------------------------------------------------------------
 * useDocumentLayout
 * -----------------------------------------------------------------------------------------------*/

/**
 * @alpha
 * @description This hook is used to get the layouts for either the edit view or list view of a specific content-type
 * including the layouts for the components used in the content-type. It also runs the mutation hook waterfall so the data
 * is consistent wherever it is used. It's a light wrapper around the `useDocument` hook, but provides the `skip` option a document
 * is not fetched, however, it does fetch the schemas & components if they do not already exist in the cache.
 *
 * If the fetch fails, it will display a notification to the user.
 *
 * @example
 * ```tsx
 * const { model } = useParams<{ model: string }>();
 * const { edit: { schema: layout } } = useDocumentLayout(model);
 *
 * return layout.map(panel => panel.map(row => row.map(field => <Field {...field} />)))
 * ```
 *
 */
const useDocumentLayout: UseDocumentLayout = (model) => {
  const { schema, components } = useDocument({ model, collectionType: '' }, { skip: true });
  const [{ query }] = useQueryParams();
  const { runHookWaterfall } = useStrapiApp();
  const toggleNotifcation = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, isLoading, error } = useGetContentTypeConfigurationQuery(model);

  React.useEffect(() => {
    if (error) {
      toggleNotifcation({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotifcation]);

  const schemas = useTypedSelector(selectSchemas);
  const layouts = React.useMemo(
    () => ({
      edit: data ? formatEditLayout(data, { schema, components }) : DEFAULT_LAYOUT,
      /**
       * TODO: refactor this to be easier to understand.
       */
      list: data ? formatLayouts(data, schemas) : DEFAULT_LAYOUT,
    }),
    [data, schema, components, schemas]
  );

  const { layout: edit } = React.useMemo(
    () =>
      runHookWaterfall(HOOKS.MUTATE_EDIT_VIEW_LAYOUT, {
        layout: layouts.edit,
        query,
      }),
    [layouts.edit, query, runHookWaterfall]
  );

  return {
    error,
    isLoading,
    edit,
    // @ts-expect-error – TODO: fix me later when we refactor the list view.
    list: layouts.list,
  } satisfies ReturnType<UseDocumentLayout>;
};

/* -------------------------------------------------------------------------------------------------
 * formatEditLayout
 * -----------------------------------------------------------------------------------------------*/
type LayoutData = Contracts.ContentTypes.FindContentTypeConfiguration.Response['data'];

/**
 * @internal
 * @description takes the configuration data, the schema & the components used in the schema and formats the edit view
 * vesions of the schema & components. This is then used to redner the edit view of the content-type.
 */
const formatEditLayout = (
  data: LayoutData,
  { schema, components }: { schema?: Schema; components: ComponentsDictionary }
): EditLayout => {
  let currentPanelIndex = 0;
  /**
   * The fields arranged by the panels, new panels are made for dynamic zones only.
   */
  const panelledEditAttributes = convertEditLayoutToFieldLayouts(
    data.contentType.layouts.edit,
    schema?.attributes,
    data.contentType.metadatas
  ).reduce<Array<FieldLayout[][]>>((panels, row) => {
    if (row.some((field) => field.type === 'dynamiczone')) {
      panels.push([row]);
      currentPanelIndex += 2;
    } else {
      if (!panels[currentPanelIndex]) {
        panels.push([]);
      }
      panels[currentPanelIndex].push(row);
    }

    return panels;
  }, []);

  const componentEditAttributes = Object.entries(data.components).reduce<EditLayout['components']>(
    (acc, [uid, configuration]) => {
      acc[uid] = convertEditLayoutToFieldLayouts(
        configuration.layouts.edit,
        components[uid].attributes,
        configuration.metadatas
      );
      return acc;
    },
    {}
  );

  return { schema: panelledEditAttributes, components: componentEditAttributes };
};

/* -------------------------------------------------------------------------------------------------
 * convertEditLayoutToFieldLayouts
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description takes the edit layout from either a content-type or a component
 * and formats it into a generic object that can be used to correctly render
 * the form fields.
 */
const convertEditLayoutToFieldLayouts = (
  rows: LayoutData['contentType']['layouts']['edit'],
  attributes: Schema['attributes'] = {},
  metadatas: Contracts.ContentTypes.Metadatas
) => {
  return rows.map((row) =>
    row
      .map((field) => {
        const attribute = attributes[field.name];

        if (!attribute) {
          return null;
        }

        const { edit: metadata } = metadatas[field.name];

        return {
          disabled: !metadata.editable,
          hint: metadata.description,
          label: metadata.label ?? '',
          name: field.name,
          placeholder: metadata.placeholder ?? '',
          required: attribute.required ?? false,
          size: field.size,
          unique: 'unique' in attribute ? attribute.unique : false,
          visible: metadata.visible ?? true,
          type: attribute.type,
        } satisfies FieldLayout;
      })
      .filter((field) => field !== null)
  ) as FieldLayout[][];
};

export { useDocumentLayout };
export type { EditLayout, FieldLayout, UseDocumentLayout };
