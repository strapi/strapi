import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { CHANNEL_MODEL_UID, DEFAULT_CHANNEL_SLUG } from '../constants';
import { getCurrentUserId, getService, type ChannelRef } from '../utils';

const { ApplicationError, NotFoundError, ValidationError } = errors;

export interface Channel {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  archived: boolean;
  isDefault: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelInput {
  slug?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  order?: number;
}

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** `Mobile app!` → `mobile-app` — mirrors the slug constraints of the channel CT. */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

/**
 * Per-process cache for header-value → channel resolution (same rationale and
 * bounds as the spaces plugin's lookup cache). Keyed on the workspace too: with
 * Spaces installed the same slug can exist in several workspaces. Cleared on
 * every channel write so archiving takes effect promptly.
 */
const LOOKUP_TTL_MS = 30_000;
const LOOKUP_MAX_ENTRIES = 1_000;
const lookupCache = new Map<string, { value: Channel | null; expiresAt: number }>();

const channelsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query(CHANNEL_MODEL_UID);

  const service = {
    /**
     * Channels of the current workspace (the spaces read net scopes the raw
     * query when Spaces is installed). Active only by default; by `order`,
     * then alphabetical.
     */
    async getAll({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<
      Channel[]
    > {
      return query().findMany({
        where: includeArchived ? {} : { archived: false },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    },

    async getById(id: number): Promise<Channel | null> {
      return query().findOne({ where: { id } });
    },

    async getBySlug(slug: string): Promise<Channel | null> {
      return query().findOne({ where: { slug } });
    },

    /**
     * Resolves a raw `X-Strapi-Channel` header value (slug, numeric id as a
     * fallback) through the TTL cache. `null` for unknown values — the caller
     * decides how to reject.
     */
    async resolveHeaderValue(raw: string, spaceId?: number | null): Promise<Channel | null> {
      const key = `${spaceId ?? ''}:${raw}`;
      const hit = lookupCache.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }

      const bySlug = await service.getBySlug(raw);
      const channel = bySlug ?? (/^\d+$/.test(raw) ? await service.getById(Number(raw)) : null);

      if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
        lookupCache.clear();
      }
      lookupCache.set(key, { value: channel, expiresAt: Date.now() + LOOKUP_TTL_MS });

      return channel;
    },

    toRef(channel: Channel): ChannelRef {
      return { id: channel.id, slug: channel.slug };
    },

    async create(input: ChannelInput): Promise<Channel> {
      const name = input.name?.trim();
      if (!name || name.length > 128) {
        throw new ValidationError('`name` must be a non-empty string of 128 characters or fewer');
      }
      const slug = slugify(input.slug || name);
      if (!slug) {
        throw new ValidationError(
          'Could not derive a valid slug — use lowercase letters, digits and dashes'
        );
      }
      if (input.color && !COLOR_REGEX.test(input.color)) {
        throw new ValidationError('`color` must be a #rrggbb hex value');
      }
      const clash = await service.getBySlug(slug);
      if (clash) {
        throw new ApplicationError(`A channel with the slug "${slug}" already exists`);
      }

      lookupCache.clear();
      const userId = getCurrentUserId();
      const created: Channel = await query().create({
        data: {
          slug,
          name,
          description: input.description ?? null,
          color: input.color ?? null,
          archived: false,
          order: input.order ?? 0,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      });

      strapi.eventHub.emit('channel.create', { channel: created });

      return created;
    },

    /** Rename, recolor, reorder, archive/restore. The slug is immutable. */
    async update(
      id: number,
      data: Partial<Pick<ChannelInput, 'name' | 'description' | 'color' | 'order'>> & {
        archived?: boolean;
      }
    ): Promise<Channel> {
      const existing = await service.getById(id);
      if (!existing) {
        throw new NotFoundError(`Unknown channel: ${id}`);
      }
      if (data.name !== undefined && (!data.name.trim() || data.name.length > 128)) {
        throw new ValidationError('`name` must be a non-empty string of 128 characters or fewer');
      }
      if (data.color && !COLOR_REGEX.test(data.color)) {
        throw new ValidationError('`color` must be a #rrggbb hex value');
      }
      if (data.archived === true && existing.isDefault) {
        throw new ValidationError(
          'The default channel cannot be archived — make another channel the default first'
        );
      }

      const userId = getCurrentUserId();
      lookupCache.clear();
      return query().update({
        where: { id },
        data: {
          ...data,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(userId ? { updatedBy: userId } : {}),
        },
      });
    },

    /**
     * Permanently removes a channel and every override recorded for it. Base
     * content is untouched by construction — deleting a channel can never
     * lose anything but the channel's own variants.
     */
    async delete(id: number): Promise<void> {
      const existing = await service.getById(id);
      if (!existing) {
        throw new NotFoundError(`Unknown channel: ${id}`);
      }
      if (existing.isDefault) {
        throw new ValidationError(
          'The default channel cannot be deleted — make another channel the default first'
        );
      }
      if (existing.slug === DEFAULT_CHANNEL_SLUG) {
        throw new ValidationError(
          `"${DEFAULT_CHANNEL_SLUG}" is the base content channel and cannot be deleted`
        );
      }

      await strapi.db.transaction(async () => {
        await getService('overrides').removeForChannel(id);
        lookupCache.clear();
        await query().delete({ where: { id } });
      });

      strapi.eventHub.emit('channel.delete', { channel: existing });
    },

    /**
     * The channel served when no `X-Strapi-Channel` header is sent, resolved
     * within the current workspace scope (the spaces read net applies) and
     * cached like the slug lookups.
     */
    async getDefault(spaceId?: number | null): Promise<Channel | null> {
      const key = `${spaceId ?? ''}:__default__`;
      const hit = lookupCache.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }
      const channel: Channel | null = await query().findOne({ where: { isDefault: true } });
      if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
        lookupCache.clear();
      }
      lookupCache.set(key, { value: channel, expiresAt: Date.now() + LOOKUP_TTL_MS });
      return channel;
    },

    /**
     * Makes `id` the default channel: clears the flag on the channels visible
     * in the current scope (per workspace with Spaces installed), then sets
     * it. The target must be active.
     */
    async setDefault(id: number): Promise<Channel> {
      const target = await service.getById(id);
      if (!target) {
        throw new NotFoundError(`Unknown channel: ${id}`);
      }
      if (target.archived) {
        throw new ValidationError('An archived channel cannot be the default');
      }
      const userId = getCurrentUserId();
      await strapi.db.transaction(async () => {
        // Scoped findMany (not a blind updateMany): with Spaces installed the
        // read net keeps the clearing inside the current workspace.
        const flagged: Channel[] = await query().findMany({ where: { isDefault: true } });
        for (const channel of flagged) {
          if (channel.id !== id) {
            await query().update({ where: { id: channel.id }, data: { isDefault: false } });
          }
        }
        await query().update({
          where: { id },
          data: { isDefault: true, ...(userId ? { updatedBy: userId } : {}) },
        });
      });
      lookupCache.clear();
      const updated = await service.getById(id);
      strapi.eventHub.emit('channel.set-default', { channel: updated });
      return updated as Channel;
    },

    /**
     * Bootstrap seed: the base "Default" channel (slug `default`, flagged as
     * the default) so the list, the pickers and the header speak the same
     * language. Idempotent; editing on it writes the base entries — it never
     * carries overrides.
     */
    async ensureDefaultChannel(): Promise<void> {
      const existing = await service.getBySlug(DEFAULT_CHANNEL_SLUG);
      if (!existing) {
        const flagged = await query().findOne({ where: { isDefault: true } });
        await query().create({
          data: {
            slug: DEFAULT_CHANNEL_SLUG,
            name: 'Default',
            description: 'The base content — served when no channel is selected.',
            color: null,
            archived: false,
            isDefault: !flagged,
            order: 0,
          },
        });
        lookupCache.clear();
        strapi.log.info('[channels] Seeded the "default" channel.');
      }
    },

    clearCache() {
      lookupCache.clear();
    },
  };

  return service;
};

type ChannelsService = typeof channelsService;

export default channelsService;
export type { ChannelsService };
