import * as React from 'react';

import { SerializedError } from '@reduxjs/toolkit';
import {
  useNotification,
  useStrapiApp,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/admin/strapi-admin';

import { HOOKS } from '../constants/hooks';
import { useGetContentTypeConfigurationQuery } from '../services/contentTypes';
import { BaseQueryError } from '../utils/api';
import { getMainField } from '../utils/attributes';

import { useContentTypeSchema } from './useContentTypeSchema';
import {
  type ComponentsDictionary,
  type Document,
  type Schema,
  useDoc,
  useDocument,
} from './useDocument';

import type { ComponentConfiguration } from '../../../shared/contracts/components';
import type {
  Metadatas,
  FindContentTypeConfiguration,
  Settings,
} from '../../../shared/contracts/content-types';
import type { Filters, InputProps, Table } from '@strapi/admin/strapi-admin';
import type { Schema as SchemaUtils } from '@strapi/types';

type LayoutOptions = Schema['options'] & Schema['pluginOptions'] & object;

interface LayoutSettings extends Settings {
  displayName?: string;
  icon?: never;
}

interface ListFieldLayout
  extends Table.Header<Document, ListFieldLayout>,
    Pick<Filters.Filter, 'mainField'> {
  attribute: SchemaUtils.Attribute.AnyAttribute | { type: 'custom' };
}

interface ListLayout {
  layout: ListFieldLayout[];
  components?: never;
  metadatas: {
    [K in keyof Metadatas]: Metadatas[K]['list'];
  };
  options: LayoutOptions;
  settings: LayoutSettings;
}
interface EditFieldSharedProps
  extends Omit<InputProps, 'hint' | 'label' | 'type'>,
    Pick<Filters.Filter, 'mainField'> {
  hint?: string;
  label: string;
  size: number;
  unique?: boolean;
  visible?: boolean;
}

/**
 * Map over all the types in Attribute Types and use that to create a union of new types where the attribute type
 * is under the property attribute and the type is under the property type.
 */
type EditFieldLayout = {
  [K in SchemaUtils.Attribute.Kind]: EditFieldSharedProps & {
    attribute: Extract<SchemaUtils.Attribute.AnyAttribute, { type: K }>;
    type: K;
  };
}[SchemaUtils.Attribute.Kind];

interface EditLayout {
  layout: Array<Array<EditFieldLayout[]>>;
  components: {
    [uid: string]: {
      layout: Array<EditFieldLayout[]>;
      settings: ComponentConfiguration['settings'] & {
        displayName?: string;
        icon?: string;
      };
    };
  };
  metadatas: {
    [K in keyof Metadatas]: Metadatas[K]['edit'];
  };
  options: LayoutOptions;
  settings: LayoutSettings;
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
 * return layout.map(panel => panel.map(row => row.map(field => <Field.Root {...field} />)))
 * ```
 *
 */
const useDocumentLayout: UseDocumentLayout = (model) => {
  const { schema, components } = useDocument({ model, collectionType: '' }, { skip: true });
  const [{ query }] = useQueryParams();
  const runHookWaterfall = useStrapiApp('useDocumentLayout', (state) => state.runHookWaterfall);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { isLoading: isLoadingSchemas, schemas } = useContentTypeSchema();

  const {
    data,
    isLoading: isLoadingConfigs,
    error,
    isFetching: isFetchingConfigs,
  } = useGetContentTypeConfigurationQuery(model);

  const isLoading = isLoadingSchemas || isFetchingConfigs || isLoadingConfigs;

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const editLayout = React.useMemo(
    () =>
      data && !isLoading
        ? formatEditLayout(data, { schemas, schema, components })
        : ({
            layout: [],
            components: {},
            metadatas: {},
            options: {},
            settings: DEFAULT_SETTINGS,
          } as EditLayout),
    [data, isLoading, schemas, schema, components]
  );

  const listLayout = React.useMemo(() => {
    return data && !isLoading
      ? formatListLayout(data, { schemas, schema, components })
      : ({
          layout: [],
          metadatas: {},
          options: {},
          settings: DEFAULT_SETTINGS,
        } as ListLayout);
  }, [data, isLoading, schemas, schema, components]);

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
type LayoutData = FindContentTypeConfiguration.Response['data'];

/**
 * @internal
 * @description takes the configuration data, the schema & the components used in the schema and formats the edit view
 * versions of the schema & components. This is then used to render the edit view of the content-type.
 */
const formatEditLayout = (
  data: LayoutData,
  {
    schemas,
    schema,
    components,
  }: { schemas: Schema[]; schema?: Schema; components: ComponentsDictionary }
): EditLayout => {
  let currentPanelIndex = 0;
  /**
   * The fields arranged by the panels, new panels are made for dynamic zones only.
   */
  const panelledEditAttributes = convertEditLayoutToFieldLayouts(
    data.contentType.layouts.edit,
    schema?.attributes,
    data.contentType.metadatas,
    { configurations: data.components, schemas: components },
    schemas
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
          configuration.metadatas,
          { configurations: data.components, schemas: components }
        ),
        settings: {
          ...configuration.settings,
          icon: components[uid].info.icon,
          displayName: components[uid].info.displayName,
        },
      };
      return acc;
    },
    {}
  );

  const editMetadatas = Object.entries(data.contentType.metadatas).reduce<EditLayout['metadatas']>(
    (acc, [attribute, metadata]) => {
      return {
        ...acc,
        [attribute]: metadata.edit,
      };
    },
    {}
  );

  return {
    layout: panelledEditAttributes,
    components: componentEditAttributes,
    metadatas: editMetadatas,
    settings: {
      ...data.contentType.settings,
      displayName: schema?.info.displayName,
    },
    options: {
      ...schema?.options,
      ...schema?.pluginOptions,
      ...data.contentType.options,
    },
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
  metadatas: Metadatas,
  components?: {
    configurations: Record<string, ComponentConfiguration>;
    schemas: ComponentsDictionary;
  },
  schemas: Schema[] = []
) => {
  return rows.map((row) =>
    row
      .map((field) => {
        const attribute = attributes[field.name];

        if (!attribute) {
          return null;
        }

        const { edit: metadata } = metadatas[field.name];

        const settings: Partial<Settings> =
          attribute.type === 'component' && components
            ? components.configurations[attribute.component].settings
            : {};

        return {
          attribute,
          disabled: !metadata.editable,
          hint: metadata.description,
          label: metadata.label ?? '',
          name: field.name,
          // @ts-expect-error – mainField does exist on the metadata for a relation.
          mainField: getMainField(attribute, metadata.mainField || settings.mainField, {
            schemas,
            components: components?.schemas ?? {},
          }),
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
const formatListLayout = (
  data: LayoutData,
  {
    schemas,
    schema,
    components,
  }: { schemas: Schema[]; schema?: Schema; components: ComponentsDictionary }
): ListLayout => {
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
    { configurations: data.components, schemas: components },
    schemas
  );

  return {
    layout: listAttributes,
    settings: { ...data.contentType.settings, displayName: schema?.info.displayName },
    metadatas: listMetadatas,
    options: {
      ...schema?.options,
      ...schema?.pluginOptions,
      ...data.contentType.options,
    },
  };
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
  components?: {
    configurations: Record<string, ComponentConfiguration>;
    schemas: ComponentsDictionary;
  },
  schemas: Schema[] = []
) => {
  return columns
    .map((name) => {
      const attribute = attributes[name];

      if (!attribute) {
        return null;
      }

      const metadata = metadatas[name];

      const settings: Partial<Settings> =
        attribute.type === 'component' && components
          ? components.configurations[attribute.component].settings
          : {};

      return {
        attribute,
        label: metadata.label ?? '',
        mainField: getMainField(attribute, metadata.mainField || settings.mainField, {
          schemas,
          components: components?.schemas ?? {},
        }),
        name: name,
        searchable: metadata.searchable ?? true,
        sortable: metadata.sortable ?? true,
      } satisfies ListFieldLayout;
    })
    .filter((field) => field !== null) as ListFieldLayout[];
};

export {
  useDocLayout,
  useDocumentLayout,
  convertListLayoutToFieldLayouts,
  convertEditLayoutToFieldLayouts,
  DEFAULT_SETTINGS,
};
export type { EditLayout, EditFieldLayout, ListLayout, ListFieldLayout, UseDocumentLayout };
