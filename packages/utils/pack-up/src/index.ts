export * from './node/build';
export * from './node/watch';
export * from './node/check';
export * from './node/init';

export { defineConfig } from './node/core/config';
export type {
  Config,
  ConfigOptions,
  ConfigBundle,
  ConfigPropertyResolver,
  ConfigProperty,
  PluginOption,
  Runtime,
} from './node/core/config';

export { defineTemplate, definePackageFeature, definePackageOption } from './node/templates/create';
export type {
  TemplateOrTemplateResolver,
  TemplateFeature,
  TemplateOption,
  TemplateFile,
} from './node/templates/types';
