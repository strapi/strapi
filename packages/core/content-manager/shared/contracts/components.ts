import type { Struct } from '@strapi/types';
import type { Configuration, Settings, Metadatas, Layouts } from './content-types';
import { errors } from '@strapi/utils';

export interface Component extends Struct.ComponentSchema {
  isDisplayed: boolean;
  info: Struct.SchemaInfo;
  apiID: string;
}

export interface ComponentConfiguration extends Configuration {
  category: string;
  isComponent: boolean;
}

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
      component: ComponentConfiguration;
      components: Record<string, ComponentConfiguration>;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /components/:uid/configuration
 */
export declare namespace UpdateComponentConfiguration {
  export interface Request {
    body: {
      layouts: Layouts;
      metadatas: Metadatas;
      settings: Settings;
    };
    query: {};
  }

  export interface Params {
    uid: string;
  }

  export interface Response {
    data: ComponentConfiguration;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
