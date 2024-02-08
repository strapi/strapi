import * as React from 'react';

import { SerializedError } from '@reduxjs/toolkit';
import {
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useStrapiApp,
} from '@strapi/helper-plugin';

import { HOOKS } from '../../constants';
import { BaseQueryError } from '../../utils/baseQuery';
import { useGetContentTypeConfigurationQuery } from '../services/contentTypes';

import { ComponentsDictionary, Schema, useDoc, useDocument } from './useDocument';

import type { InputProps } from '../components/FormInputs/types';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute } from '@strapi/types';
import type { MessageDescriptor } from 'react-intl';

interface ListFieldLayout {
  /**
   * The attribute data from the content-type's schema for the field
   */
  attribute: Attribute.Any | { type: 'custom' };
  /**
   * Typically used by plugins to render a custom cell
   */
  cellFormatter?: (
    data: { [key: string]: unknown },
    header: Omit<ListFieldLayout, 'cellFormatter'>
  ) => React.ReactNode;
  label: string | MessageDescriptor;
  /**
   * the name of the attribute we use to display the actual name e.g. relations
   * are just ids, so we use the mainField to display something meaninginful by
   * looking at the target's schema
   */
  mainField?: string;
  name: string;
  searchable?: boolean;
  sortable?: boolean;
}

interface ListLayout {
  layout: ListFieldLayout[];
  components?: never;
  metadatas: {
    [K in keyof Contracts.ContentTypes.Metadatas]: Contracts.ContentTypes.Metadatas[K]['list'];
  };
  settings: Contracts.ContentTypes.Settings;
}
interface EditFieldSharedProps extends Omit<InputProps, 'type'> {
  mainField?: string;
  size: number;
  unique?: boolean;
  visible?: boolean;
}

/**
 * Map over all the types in Attribute Types and use that to create a union of new types where the attribute type
 * is under the property attribute and the type is under the property type.
 */
type EditFieldLayout = {
  [K in Attribute.Kind]: EditFieldSharedProps & {
    attribute: Extract<Attribute.Any, { type: K }>;
    type: K;
  };
}[Attribute.Kind];

interface EditLayout {
  layout: Array<Array<EditFieldLayout[]>>;
  components: {
    [uid: string]: {
      layout: Array<EditFieldLayout[]>;
      settings: Contracts.Components.ComponentConfiguration['settings'];
    };
  };
  metadatas?: never;
  settings: Contracts.ContentTypes.Settings;
}

type UseDocumentLayout = (model: string) => {
  error?: BaseQueryError | SerializedError;
  isLoading: boolean;
  /**
   * This is the layout for the edit view,
   */
  edit: EditLayout;
  list: ListLayout;
};

/* -------------------------------------------------------------------------------------------------
 * useDocumentLayout
 * -----------------------------------------------------------------------------------------------*/

const DEFAULT_SETTINGS = {
  bulkable: false,
  filterable: false,
  searchable: false,
  pagination: false,
  defaultSortBy: '',
  defaultSortOrder: 'asc',
  mainField: 'id',
  pageSize: 10,
};

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
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { data, isLoading, error } = useGetContentTypeConfigurationQuery(model);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const editLayout = React.useMemo(
    () =>
      data
        ? formatEditLayout(data, { schema, components })
        : ({
            layout: [],
            components: {},
            settings: DEFAULT_SETTINGS,
          } as EditLayout),
    [data, schema, components]
  );

  const listLayout = React.useMemo(
    () =>
      data
        ? formatListLayout(data, { schema })
        : ({
            layout: [],
            metadatas: {},
            settings: DEFAULT_SETTINGS,
          } as ListLayout),
    [data, schema]
  );

  const { layout: edit } = React.useMemo(
    () =>
      runHookWaterfall(HOOKS.MUTATE_EDIT_VIEW_LAYOUT, {
        layout: editLayout,
        query,
      }),
    [editLayout, query, runHookWaterfall]
  );

  return {
    error,
    isLoading,
    edit,
    list: listLayout,
  } satisfies ReturnType<UseDocumentLayout>;
};

/* -------------------------------------------------------------------------------------------------
 * useDocLayout
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal this hook uses the internal useDoc hook, as such it shouldn't be used outside of the
 * content-manager because it won't work as intended.
 */
const useDocLayout = () => {
  const { model } = useDoc();
  return useDocumentLayout(model);
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
    data.contentType.metadatas,
    data.components
  ).reduce<Array<EditFieldLayout[][]>>((panels, row) => {
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
      acc[uid] = {
        layout: convertEditLayoutToFieldLayouts(
          configuration.layouts.edit,
          components[uid].attributes,
          configuration.metadatas
        ),
        settings: configuration.settings,
      };
      return acc;
    },
    {}
  );

  return {
    layout: panelledEditAttributes,
    components: componentEditAttributes,
    settings: data.contentType.settings,
  };
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
  metadatas: Contracts.ContentTypes.Metadatas,
  components?: Record<string, Contracts.Components.ComponentConfiguration>
) => {
  return rows.map((row) =>
    row
      .map((field) => {
        const attribute = attributes[field.name];

        if (!attribute) {
          return null;
        }

        const { edit: metadata } = metadatas[field.name];

        const settings =
          attribute.type === 'component' && components
            ? components[attribute.component].settings
            : {};

        return {
          attribute,
          disabled: !metadata.editable,
          hint: metadata.description,
          label: metadata.label ?? '',
          name: field.name,
          // @ts-expect-error – mainField does exist on the metadata for a relation.
          mainField: metadata.mainField || settings?.mainField,
          placeholder: metadata.placeholder ?? '',
          required: attribute.required ?? false,
          size: field.size,
          unique: 'unique' in attribute ? attribute.unique : false,
          visible: metadata.visible ?? true,
          type: attribute.type,
        };
      })
      .filter((field) => field !== null)
  ) as EditFieldLayout[][];
};

/* -------------------------------------------------------------------------------------------------
 * formatListLayout
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description takes the complete configuration data, the schema & the components used in the schema and
 * formats a list view layout for the content-type. This is much simpler than the edit view layout as there
 * are less options to consider.
 */
const formatListLayout = (data: LayoutData, { schema }: { schema?: Schema }): ListLayout => {
  const listMetadatas = Object.entries(data.contentType.metadatas).reduce<ListLayout['metadatas']>(
    (acc, [attribute, metadata]) => {
      return {
        ...acc,
        [attribute]: metadata.list,
      };
    },
    {}
  );
  /**
   * The fields arranged by the panels, new panels are made for dynamic zones only.
   */
  const listAttributes = convertListLayoutToFieldLayouts(
    data.contentType.layouts.list,
    schema?.attributes,
    listMetadatas,
    data.components
  );

  return { layout: listAttributes, settings: data.contentType.settings, metadatas: listMetadatas };
};

/* -------------------------------------------------------------------------------------------------
 * convertListLayoutToFieldLayouts
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal
 * @description takes the columns from the list view configuration and formats them into a generic object
 * combinining metadata and attribute data.
 *
 * @note We do use this to reformat the list of strings when updating the displayed headers for the list view.
 */
const convertListLayoutToFieldLayouts = (
  columns: LayoutData['contentType']['layouts']['list'],
  attributes: Schema['attributes'] = {},
  metadatas: ListLayout['metadatas'],
  components: Record<string, Contracts.Components.ComponentConfiguration> = {}
) => {
  return columns
    .map((name) => {
      const attribute = attributes[name];

      if (!attribute) {
        return null;
      }

      const metadata = metadatas[name];

      return {
        attribute,
        label: metadata.label ?? '',
        mainField:
          'component' in attribute
            ? components[attribute.component].settings.mainField
            : metadata.mainField,
        name: name,
        searchable: metadata.searchable ?? true,
        sortable: metadata.sortable ?? true,
      } satisfies ListFieldLayout;
    })
    .filter((field) => field !== null) as ListFieldLayout[];
};

export { useDocLayout, useDocumentLayout, convertListLayoutToFieldLayouts };
export type { EditLayout, EditFieldLayout, ListLayout, ListFieldLayout, UseDocumentLayout };
