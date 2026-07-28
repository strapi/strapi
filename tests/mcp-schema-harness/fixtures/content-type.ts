/**
 * The content-type fixture every scenario is written against.
 *
 * Deliberately **non-draft & publish**: on a D&P model an MCP write targets a draft, which
 * relaxes required/min and makes bad payloads recoverable before publish. A non-D&P write is
 * published immediately, so a payload that drops a required field corrupts live content. That
 * is the risky case, and the one worth measuring.
 *
 * Two components, chosen to isolate the two different failure modes:
 *
 * - `seo`   — non-repeatable. Probes whether an agent can express "patch one field" without
 *             wiping its siblings (the server delete-and-recreates an id-less component).
 * - `links` — repeatable, two existing rows. Probes array truncation: the Document Service
 *             replaces these lists wholesale, so any row missing from the payload is deleted.
 */
import type { Core } from '@strapi/types';

import type { ContentManagerModelForMcp } from '../../../packages/core/content-manager/server/src/mcp/types';

export const COMPONENTS = {
  'shared.seo': {
    attributes: {
      metaTitle: { type: 'string', required: true, maxLength: 60 },
      metaDescription: { type: 'text', required: true },
      keywords: { type: 'string' },
    },
  },
  'shared.link': {
    attributes: {
      label: { type: 'string', required: true },
      url: { type: 'string', required: true },
    },
  },
};

/**
 * Minimal Strapi stand-in: `buildDataSchema` only reaches for the components registry and
 * `strapi.get(...)` (custom fields). `contentTypes.isPrivateAttribute` additionally reads the
 * global `strapi` singleton for `api.responses.privateAttributes`, which `installGlobalStrapi`
 * below satisfies.
 */
export const mockStrapi = {
  get: () => ({ get: () => undefined }),
  components: COMPONENTS,
} as unknown as Core.Strapi;

/** `contentTypes.isPrivateAttribute` reads the global singleton; provide a config stub. */
export function installGlobalStrapi(): void {
  (globalThis as { strapi?: unknown }).strapi = {
    config: { get: (_key: string, fallback: unknown) => fallback },
  };
}

export const ATTRIBUTES = {
  title: { type: 'string', required: true },
  seo: { type: 'component', component: 'shared.seo', required: false },
  links: { type: 'component', component: 'shared.link', repeatable: true },
} as unknown as ContentManagerModelForMcp['attributes'];

export const MODEL = {
  uid: 'api::article.article',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: false },
  attributes: ATTRIBUTES,
} as unknown as ContentManagerModelForMcp;

/**
 * The document state shown to the agent in every run. Component rows carry real ids (42, 7, 8)
 * so a scenario can ask for a patch that is only expressible by echoing an id back.
 */
export const CURRENT_STATE = {
  documentId: 'abc123xyz',
  title: 'Hello World',
  seo: {
    id: 42,
    metaTitle: 'Hello World | Blog',
    metaDescription: 'An introductory post about our blog.',
    keywords: 'intro,blog',
  },
  links: [
    { id: 7, label: 'Docs', url: 'https://docs.example.com' },
    { id: 8, label: 'Blog', url: 'https://blog.example.com' },
  ],
};
