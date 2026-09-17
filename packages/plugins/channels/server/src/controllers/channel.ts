import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService } from '../utils';

import type { Channel } from '../services/channels';

const { NotFoundError, ValidationError } = errors;

const parseId = (raw: unknown): number => {
  const id = Number(raw);
  if (!Number.isInteger(id)) {
    throw new ValidationError('Invalid channel id');
  }
  return id;
};

const format = (channel: Channel, extra: Record<string, unknown> = {}) => ({
  id: channel.id,
  slug: channel.slug,
  name: channel.name,
  description: channel.description ?? null,
  color: channel.color ?? null,
  archived: channel.archived,
  isDefault: channel.isDefault,
  order: channel.order,
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt,
  ...extra,
});

const channel = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /channels/mine — active channels of the current workspace, for the
   * pickers and the CTB visibility select. Exempt from the channel header on
   * the admin side so the picker can self-heal when the stored slug is stale.
   */
  async listMine(ctx: any) {
    const channels = await getService('channels').getAll();
    ctx.body = channels.map((item) => format(item));
  },

  /** GET /channels — every channel incl. archived (settings). */
  async listAll(ctx: any) {
    const channels = await getService('channels').getAll({ includeArchived: true });
    ctx.body = channels.map((item) => format(item));
  },

  async findOne(ctx: any) {
    const id = parseId(ctx.params?.id);
    const item = await getService('channels').getById(id);
    if (!item) {
      throw new NotFoundError(`Unknown channel: ${id}`);
    }
    ctx.body = format(item);
  },

  /** POST /channels — `{ name, slug?, description?, color?, order? }`. */
  async create(ctx: any) {
    const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
    const created = await getService('channels').create({
      name: typeof body.name === 'string' ? body.name : '',
      slug: typeof body.slug === 'string' ? body.slug : '',
      description: typeof body.description === 'string' ? body.description : null,
      color: typeof body.color === 'string' && body.color ? body.color : null,
      order: Number.isInteger(body.order) ? (body.order as number) : 0,
    });
    strapi.telemetry.send('didCreateChannel');
    ctx.body = format(created);
  },

  /** PUT /channels/:id — rename, describe, recolor, reorder, archive/restore. The slug is immutable. */
  async update(ctx: any) {
    const id = parseId(ctx.params?.id);
    const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
    const data: Parameters<ReturnType<typeof getService<'channels'>>['update']>[1] = {};

    if (body.name !== undefined) {
      data.name = String(body.name);
    }
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description);
    }
    if (body.color !== undefined) {
      data.color = body.color === null || body.color === '' ? null : String(body.color);
    }
    if (body.order !== undefined) {
      if (!Number.isInteger(body.order)) {
        throw new ValidationError('`order` must be an integer');
      }
      data.order = body.order as number;
    }
    if (body.archived !== undefined) {
      if (typeof body.archived !== 'boolean') {
        throw new ValidationError('`archived` must be a boolean');
      }
      data.archived = body.archived;
    }

    if (body.isDefault === true) {
      await getService('channels').setDefault(id);
    } else if (body.isDefault === false) {
      throw new ValidationError(
        'A channel cannot unset itself as default — set another channel as the default instead'
      );
    }

    ctx.body = format(await getService('channels').update(id, data));
  },

  /** DELETE /channels/:id — drops the channel and every override recorded for it. */
  async delete(ctx: any) {
    const id = parseId(ctx.params?.id);
    const existing = await getService('channels').getById(id);
    if (!existing) {
      throw new NotFoundError(`Unknown channel: ${id}`);
    }
    await getService('channels').delete(id);
    ctx.body = { id, slug: existing.slug };
  },
});

export default channel;
