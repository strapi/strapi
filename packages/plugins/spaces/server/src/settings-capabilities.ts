import type { Core } from '@strapi/types';

import {
  DEFAULT_SPACE_SLUG,
  normalizeCapabilities,
  type SpaceCapabilities,
} from './services/spaces';
import { getService } from './utils';

/**
 * Per-workspace capabilities enforcement (see `SpaceCapabilities`). From
 * Settings → Workspaces → edit, the default workspace decides what each
 * workspace may do. Outside the default workspace:
 *
 *   - the routes of a disabled Settings section answer 404 (the admin hides
 *     the matching menu entries too);
 *   - i18n is nuanced: reading locales stays allowed everywhere (the CM's
 *     locale picker needs it) — only locale MANAGEMENT (create/update/delete)
 *     is gated;
 *   - upload is nuanced the same way: browsing assets stays allowed — only
 *     ADDING files/folders is gated; Media Library settings writes are their
 *     own capability;
 *   - `moveEntries` gates POST /spaces/move (the admin hides the actions too);
 *   - `contentApi` turns the public content API off for the workspace;
 *   - the **Content-Type Builder is a hard rule, not a capability**: the
 *     schema is global, so it is only reachable from the default workspace.
 *
 * The default workspace is never gated: it sees and manages everything.
 */
interface CapabilityRoute {
  pattern: RegExp;
  capability: keyof SpaceCapabilities;
  /** Restrict the gate to these HTTP methods; omit to gate every method. */
  methods?: string[];
}

/** Exported for the route-coverage test — every real endpoint must stay pinned. */
export const CAPABILITY_ROUTES: CapabilityRoute[] = [
  { pattern: /^\/admin\/api-tokens(\/|$)/, capability: 'apiTokens' },
  { pattern: /^\/admin\/transfer\/tokens(\/|$)/, capability: 'transferTokens' },
  { pattern: /^\/admin\/webhooks(\/|$)/, capability: 'webhooks' },
  { pattern: /^\/admin\/users(\/|$)/, capability: 'users' },
  { pattern: /^\/admin\/roles(\/|$)/, capability: 'roles' },
  // Locale management only — GET stays open for the CM locale picker.
  {
    pattern: /^\/i18n\/locales(\/|$)/,
    capability: 'internationalization',
    methods: ['POST', 'PUT', 'DELETE'],
  },
  { pattern: /^\/upload\/settings(\/|$)/, capability: 'mediaLibrarySettings', methods: ['PUT'] },
  // Adding assets/folders only — browsing the Media Library stays open. The
  // upload plugin has THREE creation endpoints: the classic POST /upload and
  // the new uploader's unstable file/URL endpoints — gate them all.
  { pattern: /^\/upload\/?$/, capability: 'upload', methods: ['POST'] },
  {
    pattern: /^\/upload\/unstable\/(upload-file|stream-from-urls)\/?$/,
    capability: 'upload',
    methods: ['POST'],
  },
  { pattern: /^\/upload\/folders\/?$/, capability: 'upload', methods: ['POST'] },
  { pattern: /^\/spaces\/move\/?$/, capability: 'moveEntries', methods: ['POST'] },
];

const CTB_RE = /^\/content-type-builder(\/|$)/;

/**
 * Workspace MANAGEMENT is default-workspace-only — "le seul super workspace,
 * c'est celui par défaut". `/spaces/mine` (switcher) and `/spaces/move`
 * (capability-gated above) stay reachable everywhere.
 */
const SPACES_MANAGEMENT: Array<{ pattern: RegExp; methods: string[] }> = [
  { pattern: /^\/spaces\/all\/?$/, methods: ['GET'] },
  { pattern: /^\/spaces\/?$/, methods: ['POST'] },
  { pattern: /^\/spaces\/\d+\/?$/, methods: ['PUT', 'DELETE'] },
];

export const registerSettingsCapabilitiesGuard = (strapi: Core.Strapi) => {
  const apiPrefix = () =>
    (strapi.config.get('api.rest.prefix', '/api') as string).replace(/\/$/, '');

  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug || spaceSlug === DEFAULT_SPACE_SLUG) {
      return next();
    }

    // Hard rule: the schema is global — the CTB only exists in default.
    if (CTB_RE.test(ctx.path)) {
      return ctx.notFound('The Content-Type Builder is only available in the default workspace');
    }

    // Hard rule: workspaces are managed from the default workspace only.
    if (
      SPACES_MANAGEMENT.some(
        (entry) => entry.pattern.test(ctx.path) && entry.methods.includes(ctx.method)
      )
    ) {
      return ctx.notFound('Workspaces are managed from the default workspace');
    }

    const match = CAPABILITY_ROUTES.find(
      (entry) =>
        entry.pattern.test(ctx.path) && (!entry.methods || entry.methods.includes(ctx.method))
    );
    const isContentApiRequest = ctx.path.startsWith(`${apiPrefix()}/`);

    if (!match && !isContentApiRequest) {
      return next();
    }

    // Cached lookup — same TTL cache the resolve-space middleware uses.
    const space = await getService('spaces').resolveHeaderValue(spaceSlug);
    const capabilities = normalizeCapabilities(space?.capabilities);

    if (match && !capabilities[match.capability]) {
      return ctx.notFound('This section is not enabled in this workspace');
    }

    if (isContentApiRequest && !capabilities.contentApi) {
      return ctx.notFound();
    }

    return next();
  });
};
