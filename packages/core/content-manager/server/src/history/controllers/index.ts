import type { Plugin } from '@strapi/types';

/**
 * The controllers will me merged with the other Content Manager controllers,
 * so we need to avoid conficts in the controller names.
 */
export const controllers: Plugin.LoadedPlugin['controllers'] = {};
