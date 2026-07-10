// Keep back compatibility of deprecated global.strapi for consumers
// TODO: Remove in v6
import '@strapi/types/_internal/globals-server';

export * from '@strapi/core';

export type * from '@strapi/types';
export type * from './cli/types';
