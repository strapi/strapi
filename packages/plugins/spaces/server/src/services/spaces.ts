import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { SPACE_UID, type Space, type SpaceStatus } from '../../../shared/constants';
import { getSpaceColumn, runUnscoped } from '../scope/context';

const { ApplicationError, NotFoundError } = errors;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slugs reachable in a space header that must never name a real space: `*` is
 * the cross-space view, and the rest would collide with route segments.
 */
const RESERVED_SLUGS = new Set(['*', 'all', 'none', 'new', 'admin', 'api']);

export interface SpaceInput {
  name: string;
  slug?: string;
  description?: string | null;
  status?: SpaceStatus;
  contentTypes?: string[] | null;
}

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * Spaces are read on every request to turn a header into an id, so they are
   * cached. The cache is small (a deployment has tens of spaces, not
   * thousands), and every write below drops it wholesale rather than trying to
   * invalidate precisely.
   *
   * It is process-local: another Strapi process keeps serving a renamed or
   * archived space until its own entry expires, which is why the TTL is short.
   */
  const CACHE_TTL_MS = 30_000;
  let cache: { at: number; bySlug: Map<string, Space>; byId: Map<number, Space> } | null = null;

  const invalidate = () => {
    cache = null;
  };

  const query = () => strapi.db.query(SPACE_UID);

  const load = async () => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return cache;
    }

    // The space registry is platform data: read it whatever space the caller is
    // in, or resolving a header would depend on the header.
    const spaces: Space[] = await runUnscoped(() => query().findMany({ limit: -1 }));

    cache = {
      at: Date.now(),
      bySlug: new Map(spaces.map((space) => [space.slug, space])),
      byId: new Map(spaces.map((space) => [space.id, space])),
    };

    return cache;
  };

  const service = {
    invalidate,

    async list(): Promise<Space[]> {
      const { bySlug } = await load();

      return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    async findById(id: number): Promise<Space | undefined> {
      const { byId } = await load();

      return byId.get(id);
    },

    async findBySlug(slug: string): Promise<Space | undefined> {
      const { bySlug } = await load();

      return bySlug.get(slug);
    },

    /** The space callers land in when they have not asked for one. */
    async getDefault(): Promise<Space | undefined> {
      const spaces = await service.list();

      return spaces.find((space) => space.isDefault) ?? spaces[0];
    },

    async count(): Promise<number> {
      const { byId } = await load();

      return byId.size;
    },

    /**
     * Resolves the value of a space header. Only active spaces resolve: a
     * request naming an archived space is refused rather than quietly served
     * from somewhere else.
     */
    async resolveHeaderValue(raw: string): Promise<Space | undefined> {
      const value = raw.trim();

      if (!value) {
        return undefined;
      }

      const space = await service.findBySlug(value);

      return space?.status === 'active' ? space : undefined;
    },

    async create(input: SpaceInput): Promise<Space> {
      const slug = input.slug ? toSlug(input.slug) : toSlug(input.name);

      if (!slug || !SLUG_PATTERN.test(slug)) {
        throw new ApplicationError(
          `"${input.slug ?? input.name}" cannot be used as a space slug. Use lowercase letters, digits and dashes.`
        );
      }

      if (RESERVED_SLUGS.has(slug)) {
        throw new ApplicationError(`"${slug}" is reserved and cannot be used as a space slug.`);
      }

      if (await service.findBySlug(slug)) {
        throw new ApplicationError(`A space with the slug "${slug}" already exists.`);
      }

      await strapi.service('plugin::spaces.limits').assertCanCreate();

      const isFirst = (await service.count()) === 0;

      const created = await runUnscoped(() =>
        query().create({
          data: {
            name: input.name,
            slug,
            description: input.description ?? null,
            status: input.status ?? 'active',
            // The first space is the one existing content was migrated into,
            // so it is the one callers fall back to.
            isDefault: isFirst,
            contentTypes: input.contentTypes ?? null,
          },
        })
      );

      invalidate();
      strapi.eventHub.emit('spaces.space.create', { space: created });

      return created;
    },

    async update(id: number, input: Partial<SpaceInput>): Promise<Space> {
      const existing = await service.findById(id);

      if (!existing) {
        throw new NotFoundError(`Space ${id} does not exist.`);
      }

      const data: Record<string, unknown> = {};

      if (input.name !== undefined) {
        data.name = input.name;
      }

      if (input.description !== undefined) {
        data.description = input.description;
      }

      if (input.contentTypes !== undefined) {
        data.contentTypes = input.contentTypes;
      }

      if (input.status !== undefined) {
        if (input.status === 'archived' && existing.isDefault) {
          throw new ApplicationError(
            'The default space cannot be archived. Make another space the default first.'
          );
        }

        data.status = input.status;
      }

      // The slug is what headers, API tokens and bookmarked URLs name a space
      // by. Renaming it would silently repoint every one of them.
      if (input.slug !== undefined && toSlug(input.slug) !== existing.slug) {
        throw new ApplicationError(
          "A space's slug cannot be changed: tokens and saved links refer to it."
        );
      }

      const updated = await runUnscoped(() => query().update({ where: { id }, data }));

      invalidate();
      strapi.eventHub.emit('spaces.space.update', { space: updated });

      return updated;
    },

    /**
     * Makes `id` the space callers fall back to. Exactly one space carries the
     * flag, so the previous default loses it in the same transaction.
     */
    async setDefault(id: number): Promise<Space> {
      const space = await service.findById(id);

      if (!space) {
        throw new NotFoundError(`Space ${id} does not exist.`);
      }

      if (space.status !== 'active') {
        throw new ApplicationError('An archived space cannot be the default space.');
      }

      await strapi.db.transaction(async () =>
        runUnscoped(async () => {
          await query().updateMany({ where: { isDefault: true }, data: { isDefault: false } });
          await query().update({ where: { id }, data: { isDefault: true } });
        })
      );

      invalidate();

      return (await service.findById(id))!;
    },

    /**
     * Deletes a space and everything that belongs to it.
     *
     * This is destructive by definition — the entries, media and memberships of
     * a space have no meaning outside it — so it refuses unless the caller says
     * how many entries they expect to lose, and refuses outright for the
     * default space.
     */
    async delete(id: number): Promise<{ deleted: Record<string, number> }> {
      const space = await service.findById(id);

      if (!space) {
        throw new NotFoundError(`Space ${id} does not exist.`);
      }

      if (space.isDefault) {
        throw new ApplicationError(
          'The default space cannot be deleted. Make another space the default first.'
        );
      }

      const deleted: Record<string, number> = {};
      const scopedUids = strapi.service('plugin::spaces.content-types').listScopedUids();

      await strapi.db.transaction(async () =>
        runUnscoped(async () => {
          for (const uid of scopedUids) {
            const column = getSpaceColumn(strapi, uid);

            if (!column) {
              continue;
            }

            const count = await strapi.db.query(uid).deleteMany({ where: { [column]: id } });

            if (count?.count) {
              deleted[uid] = count.count;
            }
          }

          await strapi.service('plugin::spaces.membership').removeAllForSpace(id);
          await query().delete({ where: { id } });
        })
      );

      invalidate();
      strapi.eventHub.emit('spaces.space.delete', { space });

      return { deleted };
    },

    /** Whether `contentTypeUid` may be used inside `space`. */
    isContentTypeAvailable(space: Space, contentTypeUid: string): boolean {
      if (!space.contentTypes) {
        return true;
      }

      return space.contentTypes.includes(contentTypeUid);
    },
  };

  return service;
};
