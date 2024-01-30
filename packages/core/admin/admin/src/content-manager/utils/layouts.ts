import omit from 'lodash/omit';

import { ModifiedLayoutData } from './schemas';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute, Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * formatLayouts
 * -----------------------------------------------------------------------------------------------*/

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

interface ListLayoutRow {
  key: string;
  name: string;
  fieldSchema: Attribute.Any | { type: 'custom' };
  metadatas: Metadata['list'];
}

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

type SettingsViewLayout = SettingsViewContentTypeLayout | SettingsViewComponentLayout;

export { formatLayoutForSettingsView };
export type {
  FormattedContentTypeLayout,
  FormattedComponentLayout,
  ListLayoutRow,
  EditLayoutRow,
  Metadata,
  SettingsViewLayout,
  SettingsViewContentTypeLayout,
  SettingsViewComponentLayout,
  MainField,
};
