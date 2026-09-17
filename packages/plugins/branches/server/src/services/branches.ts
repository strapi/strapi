import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { BRANCH_MODEL_UID, CHANGE_MODEL_UID, MAIN_SLUG } from '../constants';
import {
  getBranchableContentTypes,
  getCurrentUserId,
  runOnBranch,
  runUnfiltered,
  type BranchRef,
} from '../utils';

const { ApplicationError, NotFoundError, ValidationError } = errors;

export type BranchStatus = 'active' | 'merged' | 'archived';

export interface Branch {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  status: BranchStatus;
  parent: { id: number; slug?: string; name?: string } | null;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  slug: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: number | null;
}

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** `Spring release!` → `spring-release` — mirrors the slug constraints of the branch CT. */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

/**
 * Per-process cache for header-value → branch resolution (same rationale and
 * bounds as the spaces plugin's lookup cache). Keyed on the workspace too: with
 * Spaces installed the same slug can exist in several workspaces.
 */
const LOOKUP_TTL_MS = 30_000;
const LOOKUP_MAX_ENTRIES = 1_000;
const lookupCache = new Map<string, { value: Branch | null; expiresAt: number }>();

const branchesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query(BRANCH_MODEL_UID);

  const service = {
    /**
     * Branches of the current workspace (the spaces read net scopes the raw
     * query when Spaces is installed). Active only by default; alphabetical.
     */
    async getAll({ includeInactive = false }: { includeInactive?: boolean } = {}): Promise<
      Branch[]
    > {
      const branches: Branch[] = await query().findMany({
        where: includeInactive ? {} : { status: 'active' },
        orderBy: { name: 'asc' },
        populate: { parent: { select: ['id', 'slug', 'name'] } },
      });
      return branches;
    },

    async getById(id: number): Promise<Branch | null> {
      return query().findOne({
        where: { id },
        populate: { parent: { select: ['id', 'slug', 'name'] } },
      });
    },

    async getBySlug(slug: string): Promise<Branch | null> {
      return query().findOne({
        where: { slug },
        populate: { parent: { select: ['id', 'slug', 'name'] } },
      });
    },

    /**
     * Resolves a raw `X-Strapi-Branch` header value (slug, numeric id as a
     * fallback) through the TTL cache. `null` for unknown values — the caller
     * decides how to reject.
     */
    async resolveHeaderValue(raw: string, spaceId?: number | null): Promise<Branch | null> {
      const key = `${spaceId ?? ''}:${raw}`;
      const hit = lookupCache.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }

      const bySlug = await service.getBySlug(raw);
      const branch = bySlug ?? (/^\d+$/.test(raw) ? await service.getById(Number(raw)) : null);

      if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
        lookupCache.clear();
      }
      lookupCache.set(key, { value: branch, expiresAt: Date.now() + LOOKUP_TTL_MS });

      return branch;
    },

    /**
     * `[id, parentId, grandparentId, …]` up to (excluding) main. Bounded so a
     * corrupted parent cycle cannot hang a request.
     */
    async getChain(branchId: number): Promise<number[]> {
      const chain: number[] = [];
      let cursor: number | null = branchId;
      while (cursor !== null && chain.length < 32) {
        chain.push(cursor);
        const row: { parent?: { id: number } | null } | null = await query().findOne({
          where: { id: cursor },
          select: ['id'],
          populate: { parent: { select: ['id'] } },
        });
        cursor = row?.parent?.id ?? null;
        if (cursor !== null && chain.includes(cursor)) {
          break;
        }
      }
      return chain;
    },

    async toRef(branch: Branch): Promise<BranchRef> {
      return {
        id: branch.id,
        slug: branch.slug,
        parentId: branch.parent?.id ?? null,
        chain: await service.getChain(branch.id),
      };
    },

    async create(input: BranchInput): Promise<Branch> {
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
      if (slug === MAIN_SLUG) {
        throw new ValidationError(`"${MAIN_SLUG}" is reserved for the trunk`);
      }
      if (input.color && !COLOR_REGEX.test(input.color)) {
        throw new ValidationError('`color` must be a #rrggbb hex value');
      }
      const clash = await service.getBySlug(slug);
      if (clash) {
        throw new ApplicationError(`A branch with the slug "${slug}" already exists`);
      }

      let parent: Branch | null = null;
      if (input.parentId != null) {
        parent = await service.getById(input.parentId);
        if (!parent) {
          throw new NotFoundError(`Unknown parent branch: ${input.parentId}`);
        }
        if (parent.status !== 'active') {
          throw new ApplicationError(`Cannot branch from "${parent.name}": it is ${parent.status}`);
        }
      }

      lookupCache.clear();
      const userId = getCurrentUserId();
      const created: Branch = await query().create({
        data: {
          slug,
          name,
          description: input.description ?? null,
          color: input.color ?? null,
          status: 'active',
          parent: parent?.id ?? null,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
        populate: { parent: { select: ['id', 'slug', 'name'] } },
      });

      strapi.eventHub.emit('branch.create', { branch: created });

      return created;
    },

    async update(
      id: number,
      data: Partial<Pick<BranchInput, 'name' | 'description' | 'color'>> & {
        status?: BranchStatus;
        parentId?: number | null;
        mergedAt?: Date | null;
      }
    ): Promise<Branch> {
      const existing = await service.getById(id);
      if (!existing) {
        throw new NotFoundError(`Unknown branch: ${id}`);
      }
      if (data.name !== undefined && (!data.name.trim() || data.name.length > 128)) {
        throw new ValidationError('`name` must be a non-empty string of 128 characters or fewer');
      }
      if (data.color && !COLOR_REGEX.test(data.color)) {
        throw new ValidationError('`color` must be a #rrggbb hex value');
      }

      const { parentId, ...rest } = data;
      const userId = getCurrentUserId();
      lookupCache.clear();
      const updated: Branch = await query().update({
        where: { id },
        data: {
          ...rest,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(parentId !== undefined ? { parent: parentId } : {}),
          ...(userId ? { updatedBy: userId } : {}),
        },
        populate: { parent: { select: ['id', 'slug', 'name'] } },
      });
      return updated;
    },

    async getChildren(id: number): Promise<Branch[]> {
      return query().findMany({ where: { parent: { id } } });
    },

    /**
     * Permanently removes a branch: its deltas, every document created on it
     * (through the document service so components and join rows cascade) and
     * finally the row. Refused while child branches exist — merge or delete
     * them first, re-parenting would silently change what they inherit.
     */
    async delete(id: number): Promise<void> {
      const existing = await service.getById(id);
      if (!existing) {
        throw new NotFoundError(`Unknown branch: ${id}`);
      }
      const children = await service.getChildren(id);
      if (children.length > 0) {
        throw new ApplicationError(
          `Cannot delete "${existing.name}": ${children.length} branch${children.length === 1 ? '' : 'es'} still descend from it. Merge or delete them first.`
        );
      }

      const ref = await service.toRef(existing);

      await strapi.db.transaction(async () => {
        await strapi.db.query(CHANGE_MODEL_UID).deleteMany({ where: { branch: { id } } });

        for (const contentType of getBranchableContentTypes(strapi)) {
          const uid = contentType.uid;
          const rows: Array<{ documentId: string }> = await runUnfiltered(() =>
            strapi.db.query(uid).findMany({
              where: { branch: { id } },
              select: ['documentId'],
            })
          );
          const documentIds = [...new Set(rows.map((row) => row.documentId))];
          for (const documentId of documentIds) {
            // On the branch itself these rows are branch-local, so the
            // branching middleware lets the document service delete them for
            // real (every locale, components and relations included).
            await runOnBranch(ref, () => strapi.documents(uid).delete({ documentId, locale: '*' }));
          }
        }

        lookupCache.clear();
        await query().delete({ where: { id } });
      });

      strapi.eventHub.emit('branch.delete', { branch: existing });
    },

    clearCache() {
      lookupCache.clear();
    },
  };

  return service;
};

type BranchesService = typeof branchesService;

export default branchesService;
export type { BranchesService };
