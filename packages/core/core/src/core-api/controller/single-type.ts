import { isObject } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Struct, Core, Utils, UID } from '@strapi/types';

interface Options {
  contentType: Struct.SingleTypeSchema;
}

/**
 * Returns a single type controller to handle default core-api actions
 */
const getAuditLogService = () => strapi.get('content-audit-logs');

const safeLog = async (handler: () => Promise<void>) => {
  try {
    await handler();
  } catch (error) {
    strapi.log.error('Failed to record content audit log entry', error as Error);
  }
};

const createSingleTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<Core.CoreAPI.Controller.SingleType> => {
  const uid = contentType.uid as UID.Service;

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
      const { query, body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const existingEntity = await strapi.service(uid).find(query);
      const sanitizedBefore = existingEntity
        ? ((await this.sanitizeOutput(existingEntity, ctx)) as Record<string, unknown>)
        : null;

      const entity = await strapi.service(uid).createOrUpdate({
        ...query,
        data: sanitizedInputData,
      });

      const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as Record<
        string,
        unknown
      > & { id?: string | number };

      const recordId = sanitizedEntity?.id ?? entity?.id ?? 'singleton';

      if (sanitizedBefore) {
        await safeLog(() =>
          getAuditLogService().logUpdate({
            uid,
            recordId,
            userId: ctx.state.user?.id,
            before: sanitizedBefore,
            after: sanitizedEntity,
          })
        );
      } else {
        await safeLog(() =>
          getAuditLogService().logCreate({
            uid,
            recordId,
            userId: ctx.state.user?.id,
            entry: sanitizedEntity,
          })
        );
      }

      return this.transformResponse(sanitizedEntity);
    },

    async delete(ctx) {
      const { query } = ctx;

      const existingEntity = await strapi.service(uid).find(query);
      const sanitizedEntity = existingEntity
        ? ((await this.sanitizeOutput(existingEntity, ctx)) as Record<string, unknown> & {
            id?: string | number;
          })
        : null;

      await strapi.service(uid).delete(query);

      if (sanitizedEntity) {
        await safeLog(() =>
          getAuditLogService().logDelete({
            uid,
            recordId: sanitizedEntity?.id ?? 'singleton',
            userId: ctx.state.user?.id,
            entry: sanitizedEntity,
          })
        );
      }

      ctx.status = 204;
    },
  };
};

export { createSingleTypeController };
