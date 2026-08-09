export * from '@strapi/core';

// This overrides `compileStrapi` from `@strapi/core` which is deprecated
export { compileStrapi } from './compile';

export type * from '@strapi/types';
export type * from './cli/types';
