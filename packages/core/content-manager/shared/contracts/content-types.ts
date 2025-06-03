import type { Struct } from '@strapi/types';
import { errors } from '@strapi/utils';
import { ComponentConfiguration } from './components';

export type Settings = {
  bulkable: boolean;
  filterable: boolean;
  searchable: boolean;
  pageSize: number;
  mainField: string;
  defaultSortBy: string;
  defaultSortOrder: string;
};

export type Metadatas = {
  [key: string]: {
    edit: {
      label?: string;
      description?: string;
      placeholder?: string;
      visible?: boolean;
      editable?: boolean;
    };
    list: {
      label?: string;
      mainField?: string;
      searchable?: boolean;
      sortable?: boolean;
    };
  };
};

export type Layouts = {
  list: string[];
  edit: { name: string; size: number }[][];
};

export type Configuration = {
  uid?: string;
  settings: Settings;
  metadatas: Metadatas;
  layouts: Layouts;
  options?: object;
};

export interface ContentType extends Struct.ContentTypeSchema {
  isDisplayed: boolean;
  apiID: string;
}

/**
 * GET /content-types
 */
export declare namespace FindContentTypes {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: ContentType[];
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * GET /content-types-settings
 */
export declare namespace FindContentTypesSettings {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: Array<{
      uid: string;
      settings: Settings;
    }>;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /content-types/:uid/configuration
 */
export declare namespace FindContentTypeConfiguration {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      contentType: Configuration;
      components: Record<string, ComponentConfiguration>;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /content-types/:uid/configuration
 */
export declare namespace UpdateContentTypeConfiguration {
  export interface Request {
    body: {
      layouts: Layouts;
      metadatas: Metadatas;
      settings: Settings;
    };
    query: {};
  }
  export interface Response {
    data: {
      contentType: Configuration;
      components: Record<string, ComponentConfiguration>;
    };
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
