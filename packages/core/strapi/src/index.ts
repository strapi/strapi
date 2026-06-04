// Keep back compatibility of global.strapi for consumers
import '@strapi/types/globals-server';

export * from '@strapi/core';

export type * from '@strapi/types';
export type * from './cli/types';
