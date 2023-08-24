import type { Database } from '@strapi/database';
import type { Shared, Common } from '@strapi/strapi';

// TODO: move custom fields types to a separate file
interface CustomFieldServerOptions {
  /**
   * The name of the custom field
   */
  name: string;

  /**
   * The name of the plugin creating the custom field
   */
  plugin?: string;

  /**
   * The existing Strapi data type the custom field uses
   */
  type:
    | 'biginteger'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'decimal'
    | 'email'
    | 'enumeration'
    | 'float'
    | 'integer'
    | 'json'
    | 'password'
    | 'richtext'
    | 'string'
    | 'text'
    | 'time'
    | 'uid';

  /**
   * Settings for the input size in the Admin UI
   */
  inputSize?: {
    default: 4 | 6 | 8 | 12;
    isResizable: boolean;
  };
}

interface CustomFields {
  register: (customFields: CustomFieldServerOptions[] | CustomFieldServerOptions) => void;
}

export interface StrapiDirectories {
  static: {
    public: string;
  };
  app: {
    root: string;
    src: string;
    api: string;
    components: string;
    extensions: string;
    policies: string;
    middlewares: string;
    config: string;
  };
  dist: {
    root: string;
    src: string;
    api: string;
    components: string;
    extensions: string;
    policies: string;
    middlewares: string;
    config: string;
  };
}
