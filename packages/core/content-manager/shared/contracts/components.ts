import { Schema } from '@strapi/types';
import { errors } from '@strapi/utils';

type Component = Schema.Component & { isDisplayed: boolean; info: Schema.Info; apiID: string };

type ComponentConfiguration = {
  uid: string;
  category: string;
  settings: {
    bulkable: boolean;
    filterable: boolean;
    searchable: boolean;
    pageSize: number;
    mainField: string;
    defaultSortBy: string;
    defaultSortOrder: string;
  };
  metadatas: {
    [key: string]: {
      edit: {};
      list: {
        label: string;
        searchable: boolean;
        sortable: boolean;
      };
    };
  };
  layouts: {
    list: string[];
    edit: Record<string, string | number>[][];
  };
  isComponent: boolean;
};

/**
 * GET /components
 */
export declare namespace FindComponents {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: Component[];
    error?: errors.ApplicationError;
  }
}

/**
 * GET /components/:uid/configuration
 */
export declare namespace FindComponentConfiguration {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    uid: string;
  }
  export interface Response {
    data: {
      data: {
        component: ComponentConfiguration;
        components: Record<string, ComponentConfiguration> | {};
      };
    };
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /components/:uid/configuration
 */
export declare namespace UpdateComponentConfiguration {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    uid: string;
  }

  export interface Response {
    data: { data: ComponentConfiguration };
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
