import { get } from 'lodash';
import type Koa from 'koa';
import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { transformResponse } from './transform';
import { createSingleTypeController } from './single-type';
import { createCollectionTypeController } from './collection-type';
import requestCtx from '../../services/request-context';

const isSingleType = (
  contentType: Struct.ContentTypeSchema
): contentType is Struct.SingleTypeSchema => contentTypeUtils.isSingleType(contentType);

const getAuthFromKoaContext = (ctx: Koa.Context) => get(ctx, 'state.auth') ?? {};

/**
 * The data action a route runs: the text after the last `.` of its handler, so
 * `api::note.note.findOne` gives `findOne` and `plugin::end-users.me.find` gives `find`. Undefined
 * for a handler that is a function.
 */
export const getRouteAction = (route: unknown): string | undefined => {
  const handler = (route as { handler?: unknown } | null | undefined)?.handler;

  if (typeof handler !== 'string') {
    return undefined;
  }

  const action = handler.slice(handler.lastIndexOf('.') + 1);

  return action === '' ? undefined : action;
};

/**
 * The query each request's service call receives, as the core `sanitizeQuery` gave it: the field
 * rules ask about an output entry in the version and locale the service read it in.
 */
const sanitizedQueries = new WeakMap<object, unknown>();

/**
 * The status and locale the request reads or writes, as the field rules need them to ask about an
 * entry in the version and locale it was read in. A `status` is the Document Service's: exactly
 * `'published'` reads the published version, and any other one (`'draft'`, `'DRAFT'`, `''`) the
 * draft. A `locale` that is not one string (a list) is `'*'`: several. Absent ones are left out,
 * which is the Document Service's default (the default locale, and published for a read).
 */
export const getRequestScope = (ctx: Koa.Context, from?: unknown) => {
  const query = (from ?? ctx.query ?? {}) as Record<string, unknown>;
  const scope: { status?: 'draft' | 'published'; locale?: string } = {};

  if (query.status !== undefined) {
    scope.status = query.status === 'published' ? 'published' : 'draft';
  }

  if (query.locale !== undefined) {
    scope.locale = typeof query.locale === 'string' && query.locale !== '' ? query.locale : '*';
  }

  return scope;
};

/**
 * {@link getRequestScope} of the query the service received, with what the Document Service does
 * for the ones it leaves out: a read of a draft & publish type reads published, and a localized type
 * is read in the default locale. The field rules ask about an output entry in the version and
 * locale it was read in, and only a resolved scope says them when the response lacks `publishedAt`
 * or `locale` (`fields=`).
 */
const getResolvedScope = async (
  ctx: Koa.Context,
  contentType: Struct.ContentTypeSchema,
  action: string | undefined
) => {
  const scope = getRequestScope(ctx, sanitizedQueries.get(ctx));

  if (
    scope.status === undefined &&
    (action === 'find' || action === 'findOne') &&
    contentTypeUtils.hasDraftAndPublish(contentType)
  ) {
    scope.status = 'published';
  }

  if (scope.locale === undefined && strapi.localization?.isLocalizedContentType(contentType)) {
    const defaultLocale = await strapi.localization.getDefaultLocale();

    if (typeof defaultLocale === 'string') {
      scope.locale = defaultLocale;
    }
  }

  return scope;
};

/** Build options for contentAPI.sanitize/validate from the request context (auth, route, action, strictParams, status, locale). */
export const getContentAPIOptions = (ctx: Koa.Context) => {
  const auth = getAuthFromKoaContext(ctx);
  const route = ctx.state?.route;
  const action = getRouteAction(route);
  const options: {
    auth: unknown;
    strictParams?: boolean;
    route?: typeof route;
    action?: string;
    status?: 'draft' | 'published';
    locale?: string;
  } = { auth, route, ...getRequestScope(ctx) };
  if (action !== undefined) {
    options.action = action;
  }
  const apiStrictParams = strapi.config.get('api.rest.strictParams');
  if (typeof apiStrictParams === 'boolean') {
    options.strictParams = apiStrictParams;
  }
  return options;
};

/**
 * {@link getContentAPIOptions} for the input steps. A write routed as `update` that creates an entry
 * (a single type's first document, a new locale of a document) says so with `creates`, and the create
 * stamp applies to it too.
 */
export const getInputOptions = (ctx: Koa.Context) => {
  const options: ReturnType<typeof getContentAPIOptions> & {
    creates?: boolean;
    documentId?: string;
  } = getContentAPIOptions(ctx);

  if (ctx.state?.createsEntry === true) {
    options.creates = true;
  }

  // The core handler that runs, when it set one: a custom-named route calling the core `create` or
  // `update` writes as that action (the owner stamp, the body-owner refusal, the locks)
  const inputAction = ctx.state?.inputAction;

  if (inputAction === 'create' || inputAction === 'update') {
    options.action = inputAction;
  }

  // The entry an update writes, so its body is held to that entry's fields
  const documentId = (ctx.params as { id?: unknown } | undefined)?.id;

  if (typeof documentId === 'string' && documentId !== '') {
    options.documentId = documentId;
  }

  return options;
};

function createController<T extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema>(opts: {
  contentType: T;
}): T extends Struct.SingleTypeSchema
  ? Core.CoreAPI.Controller.SingleType
  : Core.CoreAPI.Controller.CollectionType;
function createController({
  contentType,
}: {
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema;
}) {
  // TODO: replace with Base class + SingleType and CollectionType classes

  const proto: Core.CoreAPI.Controller.Base = {
    transformResponse(data, meta) {
      const ctx = requestCtx.get();
      return transformResponse(data, meta, {
        contentType,
        useJsonAPIFormat: ctx?.headers?.['strapi-response-format'] === 'v4',
        encodeSourceMaps: ctx?.headers?.['strapi-encode-source-maps'] === 'true',
      });
    },

    async sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);
      const action = getRouteAction(ctx.state?.route);

      // The scope is for the field rules, which only a subject-aware caller has: API tokens and
      // Users & Permissions pay no default-locale lookup for it
      const scope = strapi.contentAPI.permissions.isSubjectAware(auth)
        ? await getResolvedScope(ctx, contentType, action)
        : {};

      return strapi.contentAPI.sanitize.output(data, contentType, {
        auth,
        ...(action === undefined ? {} : { action }),
        ...scope,
      });
    },

    async sanitizeInput(data, ctx) {
      return strapi.contentAPI.sanitize.input(data, contentType, getInputOptions(ctx));
    },

    async sanitizeQuery(ctx) {
      const sanitized = await strapi.contentAPI.sanitize.query(
        ctx.query,
        contentType,
        getContentAPIOptions(ctx)
      );

      if (ctx && typeof ctx === 'object') {
        sanitizedQueries.set(ctx, sanitized);
      }

      return sanitized;
    },

    async validateQuery(ctx) {
      return strapi.contentAPI.validate.query(ctx.query, contentType, getContentAPIOptions(ctx));
    },

    async validateInput(data, ctx) {
      return strapi.contentAPI.validate.input(data, contentType, getInputOptions(ctx));
    },
  };

  let ctrl;

  if (isSingleType(contentType)) {
    ctrl = createSingleTypeController({ contentType });
  } else {
    ctrl = createCollectionTypeController({ contentType });
  }

  return Object.assign(Object.create(proto), ctrl);
}

export { createController };
