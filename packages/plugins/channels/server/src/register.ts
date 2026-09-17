import type { Core } from '@strapi/types';

import { createChannelsMiddleware } from './document-service/channels';
import { getChannelsEnabledContentTypes, getOverridableAttributes } from './utils';

/**
 * Channel options only make sense on certain attributes: warn (never throw —
 * a schema must not brick the app) when a schema opts unsupported ones in.
 */
const validatePluginOptions = (strapi: Core.Strapi) => {
  const UNSUPPORTED_TYPES = new Set(['password', 'uid']);
  for (const contentType of getChannelsEnabledContentTypes(strapi)) {
    for (const name of getOverridableAttributes(contentType)) {
      const type = (contentType.attributes?.[name] as { type?: string } | undefined)?.type;
      if (type && UNSUPPORTED_TYPES.has(type)) {
        strapi.log.warn(
          `[channels] "${contentType.uid}.${name}" is marked overridable but "${type}" attributes cannot vary per channel — the option is ignored.`
        );
      }
    }
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  validatePluginOptions(strapi);

  // The document-service middleware — registered HERE so it sits ahead of the
  // middlewares other plugins register in their bootstrap (i18n's
  // non-localized sync, History's versioning, Spaces' stamping): an update on
  // a channel is short-circuited into an override and never reaches them.
  //
  // NOTE: unlike branches, channels adds NO attribute to user content types —
  // overrides live entirely in the plugin's own table, zero migration.
  strapi.documents.use(createChannelsMiddleware(strapi));

  // The resolve-channel Koa middleware is registered in `bootstrap.ts`: core
  // middlewares (error handling, `ctx.badRequest`) initialize between the
  // register and bootstrap phases and must run before it.
};
