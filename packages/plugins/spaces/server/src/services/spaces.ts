import type { Core } from '@strapi/types';

const SPACE_MODEL_UID = 'plugin::spaces.space';

/** The system workspace: seeded first, undeletable, its slug is the client fallback. */
const DEFAULT_SPACE_SLUG = 'default';

/**
 * What a workspace is allowed to do. The default workspace ignores this — it
 * sees and manages everything, everywhere.
 *
 * Two families:
 *   - Settings sections (visible & manageable from the workspace's Settings):
 *     apiTokens, transferTokens, webhooks, users, roles, internationalization,
 *     mediaLibrarySettings.
 *   - Content behaviors: publish (documents can be published/unpublished),
 *     moveEntries (entries can be moved to another workspace), upload (new
 *     assets/folders can be added to the Media Library), contentApi (the
 *     public content API serves this workspace at all).
 */
interface SpaceCapabilities {
  apiTokens: boolean;
  transferTokens: boolean;
  webhooks: boolean;
  users: boolean;
  roles: boolean;
  internationalization: boolean;
  mediaLibrarySettings: boolean;
  publish: boolean;
  moveEntries: boolean;
  upload: boolean;
  contentApi: boolean;
}

const DEFAULT_CAPABILITIES: SpaceCapabilities = {
  apiTokens: true,
  transferTokens: true,
  webhooks: true,
  users: true,
  roles: true,
  internationalization: true,
  mediaLibrarySettings: true,
  publish: true,
  moveEntries: true,
  upload: true,
  contentApi: true,
};

const normalizeCapabilities = (raw: unknown): SpaceCapabilities => ({
  ...DEFAULT_CAPABILITIES,
  ...(raw && typeof raw === 'object' ? (raw as Partial<SpaceCapabilities>) : {}),
});

interface Space {
  id: number;
  slug: string;
  name: string;
  color: string | null;
  status: 'active' | 'archived';
  capabilities?: SpaceCapabilities | null;
}

interface SpaceInput {
  slug: string;
  name: string;
  color?: string | null;
  status?: Space['status'];
  capabilities?: SpaceCapabilities;
}

/**
 * Per-process cache for header-value → space resolution. The resolve-space
 * middleware runs on every request carrying `X-Strapi-Space-Id`, so without
 * this every admin API call costs a DB lookup for a row that almost never
 * changes.
 *
 * - Keyed on the *raw* header value so both branches (slug, numeric-id
 *   fallback) and misses (negative caching — a misconfigured client polling an
 *   unknown slug must not punch through to the DB) are covered.
 * - Any write through this service clears the whole map: entries number in
 *   the dozens at most, and keyed invalidation can't know a renamed slug's old
 *   key. In multi-process deployments only the writing process clears —
 *   other processes ride out the TTL, so an archived space can keep resolving
 *   for up to TTL_MS there. Accepted: the bound is short and archiving is an
 *   administrative action.
 * - Size-capped so attacker-chosen header values can't grow the map unbounded.
 */
const LOOKUP_TTL_MS = 30_000;
const LOOKUP_MAX_ENTRIES = 1_000;
const lookupCache = new Map<string, { value: Space | null; expiresAt: number }>();

const spacesService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * All active spaces — the `default` workspace always first, then the rest
   * alphabetically. Pass `includeArchived: true` for the Settings page.
   */
  async getAll({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<Space[]> {
    const spaces: Space[] = await strapi.db.query(SPACE_MODEL_UID).findMany({
      where: includeArchived ? {} : { status: 'active' },
      orderBy: { name: 'asc' },
    });

    return spaces.sort((a, b) => {
      if (a.slug === DEFAULT_SPACE_SLUG) return -1;
      if (b.slug === DEFAULT_SPACE_SLUG) return 1;
      return a.name.localeCompare(b.name);
    });
  },

  async getBySlug(slug: string): Promise<Space | null> {
    return strapi.db.query(SPACE_MODEL_UID).findOne({ where: { slug } });
  },

  async getById(id: number): Promise<Space | null> {
    return strapi.db.query(SPACE_MODEL_UID).findOne({ where: { id } });
  },

  /**
   * Resolves a raw `X-Strapi-Space-Id` header value (slug, or a numeric id as
   * fallback) to a space, through the TTL cache above. Returns `null` for
   * unknown values — the caller decides how to reject.
   */
  async resolveHeaderValue(raw: string): Promise<Space | null> {
    const hit = lookupCache.get(raw);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }

    const bySlug = await strapi.db.query(SPACE_MODEL_UID).findOne({ where: { slug: raw } });
    const space =
      bySlug ??
      (/^\d+$/.test(raw)
        ? await strapi.db.query(SPACE_MODEL_UID).findOne({ where: { id: Number(raw) } })
        : null);

    if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
      lookupCache.clear();
    }
    lookupCache.set(raw, { value: space, expiresAt: Date.now() + LOOKUP_TTL_MS });

    return space;
  },

  async create(data: SpaceInput): Promise<Space> {
    lookupCache.clear();
    return strapi.db.query(SPACE_MODEL_UID).create({ data: { status: 'active', ...data } });
  },

  async update(id: number, data: Partial<SpaceInput>): Promise<Space> {
    lookupCache.clear();
    return strapi.db.query(SPACE_MODEL_UID).update({ where: { id }, data });
  },

  async delete(id: number): Promise<void> {
    lookupCache.clear();
    await strapi.db.query(SPACE_MODEL_UID).delete({ where: { id } });
  },
});

type SpacesService = typeof spacesService;

export default spacesService;
export { SpacesService, DEFAULT_SPACE_SLUG, DEFAULT_CAPABILITIES, normalizeCapabilities };
export type { Space, SpaceInput, SpaceCapabilities };
