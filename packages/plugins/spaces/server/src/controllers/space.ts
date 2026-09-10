import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { runUnscoped } from '../settings-visibility';
import { getService } from '../utils';

const { ApplicationError, NotFoundError, ValidationError } = errors;

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** `My Workspace!` → `my-workspace` — mirrors the slug constraints of the space CT. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics left over from NFKD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

/** `null` clears the preview origin; anything else must be an absolute http(s) URL. */
const parsePreviewBaseUrl = (raw: unknown): string | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string' || raw.length > 2048) {
    throw new ValidationError('`previewBaseUrl` must be an absolute http(s) URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError('`previewBaseUrl` must be an absolute http(s) URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('`previewBaseUrl` must be an absolute http(s) URL');
  }
  return raw.replace(/\/+$/, '');
};

const space = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /spaces/mine — the active workspaces the current admin belongs to
   * (direct binding, roles' bindings, platform-wide roles; super admins see
   * every workspace — see `services/membership.ts`).
   *
   * Query params:
   * - `contentType` (optional): only the workspaces where the given content
   *   type is visible per its `pluginOptions.spaces.visibleIn` binding (the
   *   CTB's "Workspaces" multi-select and the move-to-workspace picker).
   */
  async listMine(ctx: any) {
    const userId = ctx.state?.user?.id as number | undefined;
    const spaces =
      userId === undefined
        ? await getService('spaces').getAll()
        : await getService('membership').spacesForUser(userId);
    const contentType = ctx.query?.contentType as string | undefined;

    const filtered = contentType ? filterByContentType(strapi, spaces, contentType) : spaces;

    ctx.body = filtered.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      color: s.color ?? null,
    }));
  },

  /** GET /spaces/limits — the instance-level workspace cap and its usage (default workspace only). */
  async limits(ctx: any) {
    ctx.body = await getService('limits').getUsage();
  },

  /** GET /spaces/mine/current — the workspace the current admin was last in. */
  async getCurrent(ctx: any) {
    const userId = ctx.state?.user?.id as number | undefined;
    const slug = userId === undefined ? null : await getService('membership').getLastSlug(userId);
    ctx.body = { slug };
  },

  /** PUT /spaces/mine/current — remembers the workspace the admin switched to. */
  async setCurrent(ctx: any) {
    const userId = ctx.state?.user?.id as number | undefined;
    const slug = ctx.request?.body?.slug;
    if (userId === undefined) {
      return ctx.unauthorized();
    }
    if (typeof slug !== 'string' || slug.length === 0) {
      return ctx.badRequest('Missing or invalid `slug`');
    }
    if (!(await getService('membership').isMember(userId, slug))) {
      return ctx.badRequest('You are not a member of this workspace');
    }
    await getService('membership').setLastSlug(userId, slug);
    ctx.body = { slug };
  },

  /**
   * GET /spaces/all — every space including archived ones, for the Settings
   * page. Plain admin authentication: this is the same metadata `/spaces/mine`
   * already exposes, plus the archived rows.
   */
  async listAll(ctx: any) {
    const spaces = await getService('spaces').getAll({ includeArchived: true });

    ctx.body = spaces.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      color: s.color ?? null,
      status: s.status,
      previewBaseUrl: s.previewBaseUrl ?? null,
    }));
  },

  /**
   * PUT /spaces/:id — rename / change slug / recolor / archive / restore a
   * space. Gated by `plugin::spaces.update`.
   *
   * Slug rules: the `default` workspace's slug is locked (it's the system
   * fallback every client lands on), and a slug still referenced by a content
   * type's `pluginOptions.spaces.visibleIn` can't change — the binding is
   * stored by slug in schema.json and would silently break. Stale admin
   * localStorage selections self-heal client-side. Archiving keeps at least
   * one active space alive so the admin always has somewhere to land.
   */
  async update(ctx: any) {
    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id)) {
      throw new ValidationError('Invalid space id');
    }

    const body = (ctx.request?.body ?? {}) as {
      name?: unknown;
      slug?: unknown;
      color?: unknown;
      status?: unknown;
      previewBaseUrl?: unknown;
    };

    const spacesService = getService('spaces');
    const existing = await spacesService.getById(id);
    if (!existing) {
      throw new NotFoundError(`Unknown space: ${id}`);
    }

    const data: {
      name?: string;
      slug?: string;
      color?: string | null;
      status?: 'active' | 'archived';
      previewBaseUrl?: string | null;
    } = {};

    const previewBaseUrl = parsePreviewBaseUrl(body.previewBaseUrl);
    if (previewBaseUrl !== undefined) {
      data.previewBaseUrl = previewBaseUrl;
    }

    if (body.slug !== undefined) {
      const nextSlug = slugify(typeof body.slug === 'string' ? body.slug : '');
      if (!nextSlug) {
        throw new ValidationError(
          'Could not derive a valid slug — use lowercase letters, digits and dashes'
        );
      }
      if (nextSlug !== existing.slug) {
        if (existing.slug === 'default') {
          throw new ValidationError(
            'The default workspace slug is locked — it is the system fallback'
          );
        }
        const referencedBy = Object.values(strapi.contentTypes).find((ct) => {
          const visibleIn = (ct as any)?.pluginOptions?.spaces?.visibleIn;
          return Array.isArray(visibleIn) && visibleIn.includes(existing.slug);
        });
        if (referencedBy) {
          throw new ApplicationError(
            `Cannot change the slug: "${existing.slug}" is referenced by the Workspaces selection of ${(referencedBy as any).uid}. Update that content type first.`
          );
        }
        const clash = await spacesService.getBySlug(nextSlug);
        if (clash && clash.id !== id) {
          throw new ApplicationError(`A space with the slug "${nextSlug}" already exists`);
        }
        data.slug = nextSlug;
      }
    }

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 128) {
        throw new ValidationError('`name` must be a non-empty string of 128 characters or fewer');
      }
      data.name = name;
    }

    if (body.color !== undefined) {
      const color = body.color == null || body.color === '' ? null : String(body.color);
      if (color !== null && !COLOR_REGEX.test(color)) {
        throw new ValidationError('`color` must be a #rrggbb hex value');
      }
      data.color = color;
    }

    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'archived') {
        throw new ValidationError('`status` must be "active" or "archived"');
      }
      if (body.status === 'archived' && existing.status === 'active') {
        const active = await spacesService.getAll();
        if (active.filter((s) => s.id !== id).length === 0) {
          throw new ApplicationError('Cannot archive the last active workspace');
        }
      }
      data.status = body.status;
    }

    const updated = await spacesService.update(id, data);

    ctx.body = {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      color: updated.color ?? null,
      status: updated.status,
      previewBaseUrl: updated.previewBaseUrl ?? null,
    };
  },

  /**
   * DELETE /spaces/:id — permanently removes a workspace. Gated by
   * `plugin::spaces.delete`. The `default` workspace is undeletable, and a
   * workspace still holding content can't be removed — its entries would
   * become invisible from every workspace (dangling `space_id`). Move or
   * delete them first.
   */
  async delete(ctx: any) {
    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id)) {
      throw new ValidationError('Invalid space id');
    }

    const spacesService = getService('spaces');
    const existing = await spacesService.getById(id);
    if (!existing) {
      throw new NotFoundError(`Unknown space: ${id}`);
    }
    if (existing.slug === 'default') {
      throw new ApplicationError('The default workspace cannot be deleted');
    }

    const { getSpaceScopedContentTypes } = getService('content-types');
    for (const contentType of getSpaceScopedContentTypes(strapi)) {
      const uid = (contentType as any).uid as string;
      // `runUnscoped`: we count rows in the workspace being DELETED, not in
      // the caller's active one — the DB read net must not interfere.
      const count = (await runUnscoped(() =>
        strapi.db.query(uid as any).count({ where: { space: { id } } })
      )) as number;
      if (count > 0) {
        throw new ApplicationError(
          `Cannot delete "${existing.name}": ${count} ${uid} entr${count === 1 ? 'y' : 'ies'} still live in it. Move or delete them first.`
        );
      }
    }

    await spacesService.delete(id);

    ctx.body = { id, slug: existing.slug };
  },

  /**
   * POST /spaces — creates a new space. Gated by `plugin::spaces.create`.
   *
   * Body: `{ name: string, slug?: string, color?: string }`. The slug defaults
   * to a slugified name; the color must be a `#rrggbb` hex. Duplicate slugs are
   * a 400 so the admin form can surface the message inline.
   */
  async create(ctx: any) {
    const body = (ctx.request?.body ?? {}) as {
      name?: unknown;
      slug?: unknown;
      color?: unknown;
      previewBaseUrl?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      throw new ValidationError('Missing or invalid `name`');
    }
    if (name.length > 128) {
      throw new ValidationError('`name` must be 128 characters or fewer');
    }

    const slugSource =
      typeof body.slug === 'string' && body.slug.trim().length > 0 ? body.slug : name;
    const slug = slugify(slugSource);
    if (!slug) {
      throw new ValidationError(
        'Could not derive a valid slug — use lowercase letters, digits and dashes'
      );
    }

    const color = body.color == null || body.color === '' ? null : String(body.color);
    if (color !== null && !COLOR_REGEX.test(color)) {
      throw new ValidationError('`color` must be a #rrggbb hex value');
    }

    const spacesService = getService('spaces');
    const existing = await spacesService.getBySlug(slug);
    if (existing) {
      throw new ApplicationError(`A space with the slug "${slug}" already exists`);
    }

    // Instance-level cap (licence, or plugin config); counts archived workspaces too.
    await getService('limits').assertCanCreate();

    const created = await spacesService.create({
      name,
      slug,
      color,
      previewBaseUrl: parsePreviewBaseUrl(body.previewBaseUrl) ?? null,
    });

    ctx.body = {
      id: created.id,
      slug: created.slug,
      name: created.name,
      color: created.color ?? null,
    };
  },
});

const filterByContentType = (strapi: Core.Strapi, spaces: any[], contentTypeUid: string) => {
  const model = strapi.contentTypes[contentTypeUid as keyof typeof strapi.contentTypes];
  if (!model) return spaces; // unknown UID → return all rather than 404

  const { isCTVisibleInSpace } = getService('visibility');
  return spaces.filter((s) => isCTVisibleInSpace(model, s.slug));
};

export default space;
