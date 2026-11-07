import { isObject } from 'lodash';
import { errors } from '@strapi/utils';
import type { Struct, Core, Utils, UID } from '@strapi/types';
import type Koa from 'koa';

import { createWriteGuard, localeOf } from './write-guard';

interface Options {
  contentType: Struct.SingleTypeSchema;
}

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<Core.CoreAPI.Controller.SingleType> => {
  const uid = contentType.uid as UID.Service;
  const guard = createWriteGuard(contentType);

  /**
   * The document a single type's routes write: the one the service writes, found as it finds it
   * (any row of the type). Nothing is looked up for API tokens and Users & Permissions.
   */
  const existingDocumentId = async (ctx: Koa.Context): Promise<string | undefined> => {
    if (!guard.isSubjectAware(ctx)) {
      return undefined;
    }

    const existing = await strapi.db
      .query(contentType.uid as UID.ContentType)
      .findOne({ select: ['documentId'] });

    return existing?.documentId || undefined;
  };

  /**
   * Refuses (404) a write to the document when the caller's conditions don't match it: the
   * Document Service's `update` and `delete` ignore filters. A single type's routes carry no id.
   */
  const assertEntry = (
    ctx: Koa.Context,
    action: 'update' | 'delete' | 'publish',
    documentId: string,
    query: Record<string, unknown>
  ) =>
    strapi.contentAPI.permissions.assertEntry(
      ctx.state?.auth,
      action,
      contentType.uid as UID.ContentType,
      documentId,
      { locale: query.locale as string | string[] | undefined }
    );

  /**
   * A delete with no document yet answers 404, as a refused one does, so the caller can't tell a
   * document they may not delete from one that isn't there (it would be a 204 otherwise).
   */
  const assertExistingForDelete = async (ctx: Koa.Context, query: Record<string, unknown>) => {
    if (!guard.isSubjectAware(ctx)) {
      return;
    }

    const documentId = await existingDocumentId(ctx);

    if (!documentId) {
      throw new errors.NotFoundError('Not Found');
    }

    await assertEntry(ctx, 'delete', documentId, query);
  };

  // TODO: transform into a class
  return {
    /**
     * Retrieve single type content
     *
     */
    async find(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const entity = await strapi.service(uid).find(sanitizedQuery);

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * create or update single type content.
     */
    async update(ctx) {
      const documentId = await existingDocumentId(ctx);

      // With none yet, the first update creates the document: it is a create, for the owner and the
      // rows that say who may. A locale the document has none in is created by the update as well
      const creates = guard.isSubjectAware(ctx) && !documentId;

      if (creates) {
        guard.assertCanCreate(ctx);
      }

      const adds = documentId !== undefined && (await guard.addsLocale(ctx, documentId));

      if (adds) {
        guard.assertCanCreate(ctx);
      }

      // Before the query is validated and sanitized: a caller without `publish` writes a draft
      const resolved = await guard.resolveStatus(
        ctx,
        documentId === undefined || adds
          ? { locale: localeOf(ctx) }
          : { documentId, locale: localeOf(ctx) }
      );

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      if (documentId !== undefined) {
        await assertEntry(ctx, 'update', documentId, sanitizedQuery);

        // An update that publishes replaces the published version: it must be the caller's too. A
        // new locale has none to replace
        if (!adds && guard.publishes(ctx, resolved)) {
          await assertEntry(ctx, 'publish', documentId, sanitizedQuery);
        }
      }

      const { body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      if (creates || adds) {
        guard.markCreates(ctx);
      }

      guard.markInputAction(ctx, 'update');

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const params = {
        ...sanitizedQuery,
        ...guard.statusParam(ctx, resolved),
        data: sanitizedInputData,
      };

      const publishWritten = (written: any) =>
        resolved.publishAfterCreate
          ? guard.publishCreated(ctx, written, sanitizedQuery, (_documentId, query) =>
              strapi.service(uid).find(query)
            )
          : written;

      let entity;

      if (creates) {
        // The first document, written where it is checked: the service finds the document again
        // when it writes, so one another request created since the first look would be updated
        // with this write's owner stamp. Looked up again in the transaction, such a document is
        // held to the update checks before the write, and the written document must be the one
        // checked or, with none, the only one. With none, the written document is held to the
        // update checks once written: one the service found between that look and
        // its own is refused, and one this write created carries the caller as owner through the
        // create stamp. A document a condition does not match is refused, fail closed.
        // A mismatch rolls the write back
        entity = await strapi.db.transaction(async () => {
          const current = await existingDocumentId(ctx);

          if (current !== undefined) {
            await assertEntry(ctx, 'update', current, sanitizedQuery);

            if (guard.publishes(ctx, resolved)) {
              await assertEntry(ctx, 'publish', current, sanitizedQuery);
            }
          }

          const written = await strapi.service(uid).createOrUpdate(params);
          const writtenId: string | undefined =
            typeof written?.documentId === 'string' && written.documentId !== ''
              ? written.documentId
              : current;

          const others =
            writtenId === undefined
              ? 0
              : await strapi.db
                  .query(contentType.uid as UID.ContentType)
                  .count({ where: { documentId: { $ne: writtenId } } });

          if (
            writtenId === undefined ||
            (current !== undefined && writtenId !== current) ||
            others > 0
          ) {
            throw new errors.NotFoundError('Not Found');
          }

          if (current === undefined) {
            await assertEntry(ctx, 'update', writtenId, sanitizedQuery);
          }

          // A document this write created is judged against the `create` conditions
          await guard.assertWritten(
            ctx,
            current === undefined ? 'create' : 'update',
            { ...written, documentId: writtenId },
            sanitizedQuery,
            resolved
          );

          return publishWritten(written);
        });
      } else if (guard.isSubjectAware(ctx)) {
        // The entry the update adds must be the caller's to write once it exists; the data written
        // must match the caller's conditions for the action (`create` for an added locale); and a
        // conditioned `publish` is decided on the draft as written. All are judged in the
        // transaction that writes it, so a mismatch leaves nothing behind
        entity = await strapi.db.transaction(async () => {
          const written = await strapi.service(uid).createOrUpdate(params);

          if (adds && documentId !== undefined) {
            await assertEntry(ctx, 'update', documentId, sanitizedQuery);
          }

          await guard.assertWritten(
            ctx,
            adds ? 'create' : 'update',
            written,
            sanitizedQuery,
            resolved
          );

          return publishWritten(written);
        });
      } else {
        entity = await strapi.service(uid).createOrUpdate(params);
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    async delete(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      await assertExistingForDelete(ctx, sanitizedQuery);

      await strapi.service(uid).delete(sanitizedQuery);

      ctx.status = 204;
    },
  };
};

export { createSingleTypeController };
