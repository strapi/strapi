import type { Core } from '@strapi/types';
import { getService } from '../utils';

const space = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /spaces/mine — returns all active spaces visible to the current
   * admin user.
   *
   * Query params:
   * - `contentType` (optional): if provided, returns only spaces where the
   *   given content type is visible per its `multiTenancy.visibleIn` binding.
   *   Used by the CTB's "Visible in spaces" multi-select and (next slice)
   *   by the move-to-space picker.
   *
   * For Phase 3 entry, every authenticated admin sees every active space
   * (no per-user filtering yet). A follow-up slice will filter by role
   * assignment.
   */
  async listMine(ctx: any) {
    const spaces = await getService('spaces').getAll();
    const contentType = ctx.query?.contentType as string | undefined;

    const filtered = contentType ? filterByContentType(strapi, spaces, contentType) : spaces;

    ctx.body = filtered.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      color: s.color ?? null,
    }));
  },
});

const filterByContentType = (strapi: Core.Strapi, spaces: any[], contentTypeUid: string) => {
  const model = strapi.contentTypes[contentTypeUid as keyof typeof strapi.contentTypes];
  if (!model) return spaces; // unknown UID → return all rather than 404

  const { isCTVisibleInSpace } = getService('visibility');
  return spaces.filter((s) => isCTVisibleInSpace(model, s.slug));
};

export default space;
