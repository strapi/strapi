import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { MAIN_SLUG } from '../constants';
import { getService } from '../utils';

import type { Branch } from '../services/branches';

const { NotFoundError, ValidationError } = errors;

const parseId = (raw: unknown): number => {
  const id = Number(raw);
  if (!Number.isInteger(id)) {
    throw new ValidationError('Invalid branch id');
  }
  return id;
};

const format = (branch: Branch, extra: Record<string, unknown> = {}) => ({
  id: branch.id,
  slug: branch.slug,
  name: branch.name,
  description: branch.description ?? null,
  color: branch.color ?? null,
  status: branch.status,
  parent: branch.parent
    ? { id: branch.parent.id, slug: branch.parent.slug, name: branch.parent.name }
    : null,
  mergedAt: branch.mergedAt ?? null,
  createdAt: branch.createdAt,
  updatedAt: branch.updatedAt,
  ...extra,
});

const branch = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /branches/mine — active branches of the current workspace, for the
   * picker. Exempt from the branch header on the admin side so the picker can
   * self-heal when the stored slug is stale.
   */
  async listMine(ctx: any) {
    const branches = await getService('branches').getAll();
    ctx.body = [
      { id: null, slug: MAIN_SLUG, name: 'Main', color: null, status: 'active', parent: null },
      ...branches.map((item) => format(item)),
    ];
  },

  /** GET /branches — every branch incl. merged/archived, with change counts. */
  async listAll(ctx: any) {
    const service = getService('branches');
    const changes = getService('changes');
    const branches = await service.getAll({ includeInactive: true });
    ctx.body = await Promise.all(
      branches.map(async (item) =>
        format(item, { changesCount: await changes.countByBranch(item.id) })
      )
    );
  },

  async findOne(ctx: any) {
    const id = parseId(ctx.params?.id);
    const item = await getService('branches').getById(id);
    if (!item) {
      throw new NotFoundError(`Unknown branch: ${id}`);
    }
    ctx.body = format(item, { changesCount: await getService('changes').countByBranch(id) });
  },

  /** POST /branches — `{ name, slug?, parentId?, description?, color? }`. */
  async create(ctx: any) {
    const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
    const created = await getService('branches').create({
      name: typeof body.name === 'string' ? body.name : '',
      slug: typeof body.slug === 'string' ? body.slug : '',
      parentId:
        body.parentId === undefined || body.parentId === null || body.parentId === ''
          ? null
          : parseId(body.parentId),
      description: typeof body.description === 'string' ? body.description : null,
      color: typeof body.color === 'string' && body.color ? body.color : null,
    });
    strapi.telemetry.send('didCreateContentBranch');
    ctx.body = format(created);
  },

  /** PUT /branches/:id — rename, describe, recolor, archive/restore. */
  async update(ctx: any) {
    const id = parseId(ctx.params?.id);
    const body = (ctx.request?.body ?? {}) as Record<string, unknown>;
    const data: Parameters<ReturnType<typeof getService<'branches'>>['update']>[1] = {};

    if (body.name !== undefined) {
      data.name = String(body.name);
    }
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description);
    }
    if (body.color !== undefined) {
      data.color = body.color === null || body.color === '' ? null : String(body.color);
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'archived') {
        throw new ValidationError('`status` must be "active" or "archived"');
      }
      const existing = await getService('branches').getById(id);
      if (existing?.status === 'merged') {
        throw new ValidationError('A merged branch cannot change status');
      }
      data.status = body.status;
    }

    ctx.body = format(await getService('branches').update(id, data));
  },

  /** DELETE /branches/:id — drops the branch, its deltas and its created documents. */
  async delete(ctx: any) {
    const id = parseId(ctx.params?.id);
    const existing = await getService('branches').getById(id);
    if (!existing) {
      throw new NotFoundError(`Unknown branch: ${id}`);
    }
    await getService('branches').delete(id);
    ctx.body = { id, slug: existing.slug };
  },
});

export default branch;
