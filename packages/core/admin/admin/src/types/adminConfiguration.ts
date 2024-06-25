import type { Attribute, Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * Configuration – This should be exported from the Content Manager plugin.
 * -----------------------------------------------------------------------------------------------*/

export interface Settings {
  bulkable: boolean;
  filterable: boolean;
  searchable: boolean;
  pageSize: number;
  mainField: string;
  defaultSortBy: string;
  defaultSortOrder: string;
}

export interface Metadatas {
  [key: string]: {
    edit:
      | {
          label: string;
          description: string;
          placeholder: string;
          visible: boolean;
          editable: boolean;
        }
      | object;
    list:
      | {
          label: string;
          searchable: boolean;
          sortable: boolean;
        }
      | object;
  };
}

export interface Layouts {
  list: string[];
  edit: { name: string; size: number }[][];
}

export interface Configuration {
  uid: string;
  settings: Settings;
  metadatas: Metadatas;
  layouts: Layouts;
}

/* -------------------------------------------------------------------------------------------------
 * CMAdminConfiguration
 * -----------------------------------------------------------------------------------------------*/

/**
 * The admin panel completely mutates the configuration object before passing it anywhere.
 * So unfortunately, we need to create a special type here. It looks like it just smashes
 * a configuration and schema together...
 *
 * In the future we could look at fixing this and making it make some sense, but that
 * would be a breaking change. But perhaps necessary?
 */
export interface CMAdminConfiguration
  extends Omit<Configuration, 'layouts'>,
    Omit<Schema.ContentType, 'uid' | 'collectionName' | 'globalId' | 'modelName'> {
  apiID: string;
  isDisplayed: boolean;
  layouts: {
    list: null;
    edit: Array<RelationLayout | NonRelationLayout>[];
  };
}

export type NonRelationLayout = Layouts['edit'][number][number] & {
  fieldSchema: Pick<Exclude<Attribute.Any, { type: 'relation' }>, 'pluginOptions' | 'type'>;
  /**
   * why is this trying to beplural? You don't pluralize metadata.
   *
   * TODO: does this object come from somewhere else in the codebase?
   */
  metadatas: {
    description: string;
    editable: boolean;
    label: string;
    placeholder: string;
    visible: boolean;
  };
};

export interface RelationLayout extends Omit<NonRelationLayout, 'fieldSchema'> {
  fieldSchema: Pick<
    Extract<Attribute.Any, { type: 'relation' }>,
    'pluginOptions' | 'relation' | 'type'
  > & {
    mappedBy: string;
    relationType: string;
    target: string;
    targetModel: string;
  };
  queryInfos: {
    shouldDisplayRelationLink: boolean;
    defaultParams: {
      locale?: string;
      [key: string]: string | undefined;
    };
  };
  targetModelPluginOptions: object;
}
