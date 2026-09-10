import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';

/**
 * The few things that belong to the default workspace only, whatever the
 * caller's role: the schema is global, a release publishes as a whole, and
 * workspaces are managed from default. Everything else a workspace may do is
 * decided by the users' roles (RBAC), never per workspace.
 */
interface DefaultOnlyRule {
  pattern: RegExp;
  methods: string[];
  message: string;
}

/**
 * Schema writes are default-only; GETs (`/schema`, `/reserved-names`) stay open
 * so the builder can render read-only in a sub-workspace.
 */
export const CTB_WRITE_RULE: DefaultOnlyRule = {
  pattern: /^\/content-type-builder(\/|$)/,
  methods: ['POST', 'PUT', 'DELETE'],
  message: 'Content types are managed from the default workspace',
};

/** A release publishes as a whole: only the default workspace publishes. */
export const RELEASE_PUBLISH_RULE: DefaultOnlyRule = {
  pattern: /^\/content-releases\/[^/]+\/publish\/?$/,
  methods: ['POST'],
  message: 'Releases are published from the default workspace',
};

/**
 * Workspace management (list all, create, update, delete, limits) is
 * default-only. `/spaces/mine*`, `/spaces/move`, `/spaces/entry-states` and
 * `/spaces/releases/:id/status` stay reachable everywhere.
 */
export const WORKSPACE_MANAGEMENT_RULES: DefaultOnlyRule[] = [
  {
    pattern: /^\/spaces\/all\/?$/,
    methods: ['GET'],
    message: 'Workspaces are managed from the default workspace',
  },
  {
    pattern: /^\/spaces\/limits\/?$/,
    methods: ['GET'],
    message: 'Workspaces are managed from the default workspace',
  },
  {
    pattern: /^\/spaces\/?$/,
    methods: ['POST'],
    message: 'Workspaces are managed from the default workspace',
  },
  {
    pattern: /^\/spaces\/\d+\/?$/,
    methods: ['PUT', 'DELETE'],
    message: 'Workspaces are managed from the default workspace',
  },
];

export const DEFAULT_ONLY_RULES: DefaultOnlyRule[] = [
  CTB_WRITE_RULE,
  RELEASE_PUBLISH_RULE,
  ...WORKSPACE_MANAGEMENT_RULES,
];

export const findDefaultOnlyRule = (path: string, method: string): DefaultOnlyRule | undefined =>
  DEFAULT_ONLY_RULES.find((rule) => rule.pattern.test(path) && rule.methods.includes(method));

export const registerDefaultOnlyGuard = (strapi: Core.Strapi) => {
  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug || spaceSlug === DEFAULT_SPACE_SLUG) {
      return next();
    }

    const rule = findDefaultOnlyRule(ctx.path, ctx.method);
    if (rule) {
      // Workspace management answers 404 (it does not exist there), the rest 403.
      return WORKSPACE_MANAGEMENT_RULES.includes(rule)
        ? ctx.notFound(rule.message)
        : ctx.forbidden(rule.message);
    }

    return next();
  });
};
