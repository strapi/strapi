import type { Core } from '@strapi/strapi';
import type {} from '@strapi/content-type-builder/strapi-server';

declare const app: Core.Strapi;

// Loading the Content-Type Builder contracts does not opt applications into strictness: lookups keep
// develop's permissive service types.
app.plugin('content-type-builder').service('api-handler').backup(1).anything();
app.service('plugin::content-type-builder.builder').missing();
app.plugin('content-type-builder').service('component-categories').editCategory(1).anything();
app.service('plugin::content-type-builder.content-structure').commitFromUpdate([]).anything();
