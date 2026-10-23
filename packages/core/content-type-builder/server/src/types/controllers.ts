import type { Core } from '@strapi/types';

/** Admin action reading the reserved model and attribute names. */
export type BuilderController = {
  getReservedNames: Core.ControllerHandler;
};

/** Admin actions renaming and deleting component categories. */
export type ComponentCategoriesController = {
  editCategory: Core.ControllerHandler;
  deleteCategory: Core.ControllerHandler;
};

/** Admin and Content API actions listing and reading components, and admin actions writing them. */
export type ComponentsController = {
  getComponents: Core.ControllerHandler;
  getComponent: Core.ControllerHandler;
  createComponent: Core.ControllerHandler;
  updateComponent: Core.ControllerHandler;
  deleteComponent: Core.ControllerHandler;
};

/** Admin and Content API actions listing and reading content types, and admin actions writing them. */
export type ContentTypesController = {
  getContentTypes: Core.ControllerHandler;
  getContentType: Core.ControllerHandler;
  createContentType: Core.ControllerHandler;
  updateContentType: Core.ControllerHandler;
  deleteContentType: Core.ControllerHandler;
};

/** Admin actions reading the whole schema, updating it in one batch, and reading the update status. */
export type SchemaController = {
  getSchema: Core.ControllerHandler;
  updateSchema: Core.ControllerHandler;
  getUpdateSchemaStatus: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  builder: BuilderController;
  'component-categories': ComponentCategoriesController;
  components: ComponentsController;
  'content-types': ContentTypesController;
  schema: SchemaController;
};
