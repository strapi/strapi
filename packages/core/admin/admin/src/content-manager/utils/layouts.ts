import cloneDeep from 'lodash/cloneDeep';
import omit from 'lodash/omit';

import { ModifiedLayoutData, mergeMetasWithSchema } from './schemas';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute, Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * formatLayouts
 * -----------------------------------------------------------------------------------------------*/

type LayoutData = Contracts.ContentTypes.FindContentTypeConfiguration.Response['data'];
type Models = Array<Contracts.Components.Component | Contracts.ContentTypes.ContentType>;

const getRelationModel = (targetModel: string, models: Models) =>
  models.find((model) => model.uid === targetModel);

type FormattedContentTypeLayout = Omit<SchemasWithMeta['contentType'], 'layouts'> & {
  layouts: {
    edit: EditLayoutRow[][];
    list: ListLayoutRow[];
  };
};

type FormattedComponentLayout = Omit<SchemasWithMeta['components'][string], 'layouts'> & {
  layouts: {
    list: string[];
    edit: EditLayoutRow[][];
  };
};

interface FormattedLayouts {
  contentType: FormattedContentTypeLayout;
  components: Record<string, FormattedComponentLayout>;
}

const formatLayouts = (initialData: LayoutData, models: Models): FormattedLayouts => {
  const data = createMetasSchema(initialData, models);

  const contentType = {
    ...data.contentType,
    layouts: {
      ...data.contentType.layouts,
      edit: formatLayoutWithMetas(data.contentType, models),
      list: formatListLayoutWithMetas(data.contentType, data.components),
    },
  } satisfies FormattedContentTypeLayout;

  const components = Object.keys(data.components).reduce<Record<string, FormattedComponentLayout>>(
    (acc, componentUid) => {
      const formattedComponentEditLayout = formatLayoutWithMetas(
        data.components[componentUid],
        models
      );

      acc[componentUid] = {
        ...data.components[componentUid],
        layouts: {
          ...data.components[componentUid].layouts,
          edit: formattedComponentEditLayout,
        },
      } satisfies FormattedComponentLayout;

      return acc;
    },
    {}
  );

  return {
    contentType,
    components,
  };
};

type MainField = Attribute.Any & {
  name: string;
};

interface Metadata {
  edit: Contracts.ContentTypes.Metadatas[string]['edit'] & {
    mainField?: MainField;
  };
  list: Contracts.ContentTypes.Metadatas[string]['list'] & {
    mainField?: MainField;
  };
}

interface SchemasWithMeta {
  contentType: Omit<ModifiedLayoutData<'contentType'>['contentType'], 'metadatas'> & {
    metadatas: Record<string, Metadata>;
  };
  components: Record<
    string,
    Omit<ModifiedLayoutData<'contentType'>['components'][string], 'metadatas'> & {
      metadatas: Record<string, Metadata>;
    }
  >;
}

const createMetasSchema = (initialData: LayoutData, models: Models): SchemasWithMeta => {
  const data = mergeMetasWithSchema(cloneDeep(initialData), models, 'contentType');
  const { components, contentType } = data;

  const formatMetadatas = (
    targetSchema:
      | (Contracts.ContentTypes.Configuration & Contracts.ContentTypes.ContentType)
      | (Contracts.Components.ComponentConfiguration & Contracts.Components.Component)
  ) => {
    return Object.keys(targetSchema.metadatas).reduce<Record<string, Metadata>>((acc, current) => {
      const schema = targetSchema.attributes[current] ?? {};

      let metadatas: Metadata = targetSchema.metadatas[current];

      if (schema.type === 'relation' && 'target' in schema) {
        const relationModel = getRelationModel(schema.target, models)!;

        // @ts-expect-error TODO: fix this, im not sure why `mainField` is not in the type
        const mainFieldName = metadatas.edit.mainField as string;

        const mainField = {
          name: mainFieldName,
          ...relationModel.attributes[mainFieldName],
        };

        metadatas = {
          list: {
            ...metadatas.list,
            mainField,
          },
          edit: {
            ...metadatas.edit,
            mainField,
          },
        };
      }

      acc[current] = metadatas;

      return acc;
    }, {});
  };

  data.contentType.metadatas = formatMetadatas(contentType);

  Object.keys(components).forEach((compoUID) => {
    data.components[compoUID].metadatas = formatMetadatas(components[compoUID]);
  });

  return data;
};

interface EditLayoutRow {
  name: string;
  size: number;
  fieldSchema: Attribute.Any & {
    /**
     * This type is not part of the strapi types, because it doesn't exist
     * on the schema, it's added by the server code.
     */
    customField?: string;
  };
  metadatas: Metadata['edit'];
  targetModelPluginOptions?: Schema.ContentType['pluginOptions'];
  queryInfos?: {
    defaultParams?: object;
    shouldDisplayRelationLink?: boolean;
  };
}

const formatLayoutWithMetas = (
  contentTypeConfiguration: SchemasWithMeta['contentType'] | SchemasWithMeta['components'][string],
  models: Models
) =>
  contentTypeConfiguration.layouts.edit.reduce<EditLayoutRow[][]>((acc, current) => {
    const row = current.map((attribute) => {
      const fieldSchema = contentTypeConfiguration.attributes[attribute.name] ?? {};

      const data: EditLayoutRow = {
        ...attribute,
        fieldSchema,
        metadatas: contentTypeConfiguration.metadatas[attribute.name].edit ?? {},
      };

      if (fieldSchema.type === 'relation') {
        // @ts-expect-error TODO: fix this.
        const targetModelSchema = getRelationModel(fieldSchema.target, models)!;
        const targetModelPluginOptions = targetModelSchema.pluginOptions || {};

        data.targetModelPluginOptions = targetModelPluginOptions;
        data.queryInfos = {
          shouldDisplayRelationLink: shouldDisplayRelationLink(
            contentTypeConfiguration,
            attribute.name,
            models
          ),
        };
      }

      return data;
    });

    acc.push(row);

    return acc;
  }, []);

interface ListLayoutRow {
  key: string;
  name: string;
  fieldSchema: Attribute.Any | { type: 'custom' };
  metadatas: Metadata['list'];
}

const formatListLayoutWithMetas = (
  contentTypeConfiguration: SchemasWithMeta['contentType'],
  components: SchemasWithMeta['components']
) => {
  const formatted = contentTypeConfiguration.layouts.list.reduce<ListLayoutRow[]>(
    (acc, current) => {
      const fieldSchema = contentTypeConfiguration.attributes[current] ?? {};
      const metadatas = contentTypeConfiguration.metadatas[current].list ?? {};

      if (fieldSchema.type === 'component') {
        const component = components[fieldSchema.component];
        const mainFieldName = component.settings.mainField;
        const mainFieldAttribute = component.attributes[mainFieldName];

        acc.push({
          key: `__${current}_key__`,
          name: current,
          fieldSchema,
          metadatas: {
            ...metadatas,
            mainField: {
              ...mainFieldAttribute,
              name: mainFieldName,
            },
          },
        });

        return acc;
      }

      acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

      return acc;
    },
    []
  );

  return formatted;
};

const shouldDisplayRelationLink = (
  contentTypeConfiguration: SchemasWithMeta['contentType'] | SchemasWithMeta['components'][string],
  fieldName: string,
  models: Models
): boolean => {
  // @ts-expect-error – TODO: fix this type issue.
  const targetModel = contentTypeConfiguration.attributes[fieldName].targetModel ?? '';

  return models.some((model) => model.uid === targetModel && model.isDisplayed);
};

/* -------------------------------------------------------------------------------------------------
 * formatLayoutForSettingsView
 * -----------------------------------------------------------------------------------------------*/

interface MetadataWithStringMainField {
  edit: Omit<Metadata['edit'], 'mainField'> & {
    mainField?: string;
  };
  list: Omit<Metadata['list'], 'mainField'>;
}

type ReturnLayout<TLayout> = TLayout extends FormattedContentTypeLayout
  ? SettingsViewContentTypeLayout
  : SettingsViewComponentLayout;

const formatLayoutForSettingsView = <
  TLayout extends FormattedContentTypeLayout | FormattedComponentLayout
>({
  layouts,
  metadatas,
  ...rest
}: TLayout): ReturnLayout<TLayout> => {
  // @ts-expect-error – TODO: fix this.
  return {
    ...rest,
    layouts: {
      edit: layouts.edit.map((row) =>
        row.map(({ name, size }) => ({
          name,
          size,
        }))
      ),
      list: layouts.list.map((obj) => {
        if (typeof obj === 'object' && 'name' in obj) {
          return obj.name;
        }

        return obj;
      }),
    },
    metadatas: Object.keys(metadatas).reduce<Record<string, MetadataWithStringMainField>>(
      (acc, current) => {
        const currentMetadatas = metadatas[current] ?? {};

        if (currentMetadatas.edit.mainField) {
          return {
            ...acc,
            [current]: {
              edit: {
                ...currentMetadatas.edit,
                mainField: currentMetadatas.edit.mainField.name,
              },
              list: omit(currentMetadatas.list, ['mainField']),
            },
          };
        } else {
          return {
            ...acc,
            [current]: {
              edit: currentMetadatas.edit as MetadataWithStringMainField['edit'],
              list: omit(currentMetadatas.list, ['mainField']),
            },
          };
        }
      },
      {}
    ),
  };
};

interface SettingsViewContentTypeLayout
  extends Omit<FormattedContentTypeLayout, 'metadatas' | 'layouts'> {
  layouts: {
    edit: Array<Array<{ name: string; size: number }>>;
    list: Array<string>;
  };
  metadatas: Record<string, MetadataWithStringMainField>;
}

interface SettingsViewComponentLayout
  extends Omit<FormattedComponentLayout, 'metadatas' | 'layouts'> {
  layouts: {
    edit: Array<Array<{ name: string; size: number }>>;
    list: Array<string>;
  };
  metadatas: Record<string, MetadataWithStringMainField>;
}

export { formatLayouts, formatLayoutForSettingsView };
export type {
  FormattedLayouts,
  FormattedContentTypeLayout,
  FormattedComponentLayout,
  ListLayoutRow,
  EditLayoutRow,
  Metadata,
  SettingsViewContentTypeLayout,
  SettingsViewComponentLayout,
  MainField,
};
