// Keep back compatibility of deprecated global.strapi for consumers
// A type reference (not a side-effect import) so no runtime require of @strapi/types is emitted
// TODO: Remove in v6
/// <reference types="@strapi/types/globals-server" preserve="true" />

export * from '@strapi/core';

export type * from '@strapi/types';
export type * from './cli/types';
