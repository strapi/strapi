import { errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';
import type { Context } from 'koa';

import { SPACE_ATTRIBUTE } from '../../../shared/constants';
import { runUnscoped } from '../scope/context';

const { ValidationError } = errors;

/** Documents asked about in one go, so a list page costs one request. */
const MAX_DOCUMENTS = 200;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Which space each of these documents belongs to.
   *
   * The Content Manager needs this for its all-spaces view, where entries from
   * every tenant appear side by side and "which brand is this?" is the one
   * thing the list cannot otherwise say.
   *
   * It is a separate endpoint rather than a field on the entries because the
   * space is private: exposing it on the entry itself would put it in every
   * content API response, for the sake of one admin column.
   */
  async find(ctx: Context) {
    const uid = ctx.query.uid as string | undefined;
    const raw = ctx.query.documentIds;

    if (!uid || !strapi.contentType(uid as UID.ContentType)) {
      throw new ValidationError('"uid" must name a content type.');
    }

    const contentType = strapi.contentType(uid as UID.ContentType);

    if (!contentType.attributes?.[SPACE_ATTRIBUTE]) {
      ctx.body = { data: {} };

      return;
    }

    const documentIds = (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (documentIds.length === 0) {
      ctx.body = { data: {} };

      return;
    }

    if (documentIds.length > MAX_DOCUMENTS) {
      throw new ValidationError(`At most ${MAX_DOCUMENTS} documents can be asked about at once.`);
    }

    // Read past the caller's scope: the point is to report ownership across
    // spaces, and this route is only reachable by someone allowed to see that.
    const rows = await runUnscoped(() =>
      strapi.db.query(uid).findMany({
        where: { documentId: { $in: documentIds } },
        select: ['documentId'],
        populate: { [SPACE_ATTRIBUTE]: { select: ['id', 'name', 'slug'] } },
        limit: -1,
      })
    );

    const data: Record<string, { id: number; name: string; slug: string } | null> = {};

    for (const row of rows as Array<Record<string, any>>) {
      // A document has one owner across its locales and its draft and published
      // rows, so whichever row answers first is the answer.
      if (data[row.documentId] === undefined) {
        data[row.documentId] = row[SPACE_ATTRIBUTE] ?? null;
      }
    }

    ctx.body = { data };
  },
});
