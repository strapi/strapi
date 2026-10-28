import { isObject } from 'lodash';
import { errors } from '@strapi/utils';
import type { Core, Struct, UID } from '@strapi/types';
import type Koa from 'koa';

import { CoreController } from './core-controller';

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export class CollectionTypeController
  extends CoreController<Struct.CollectionTypeSchema>
  implements Core.CoreAPI.Controller.CollectionType
{
  private get uid() {
    return this.contentType.uid as UID.Service;
  }

  /**
   * Retrieve records.
   */
  async find(ctx: Koa.Context) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const { results, pagination } = await this.strapi.service(this.uid).find(sanitizedQuery);
    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  }

  /**
   * Retrieve a record
   */
  async findOne(ctx: Koa.Context) {
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const entity = await this.strapi.service(this.uid).findOne(id, sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  }

  /**
   * Create a record.
   */
  async create(ctx: Koa.Context) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const { body = {} as any } = ctx.request;

    if (!isObject(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }

    await this.validateInput(body.data, ctx);

    const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

    const entity = await this.strapi.service(this.uid).create({
      ...sanitizedQuery,
      data: sanitizedInputData,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    ctx.status = 201;
    return this.transformResponse(sanitizedEntity);
  }

  /**
   * Update a record.
   */
  async update(ctx: Koa.Context) {
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const { body = {} as any } = ctx.request;

    if (!isObject(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }

    await this.validateInput(body.data, ctx);

    const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

    const entity = await this.strapi.service(this.uid).update(id, {
      ...sanitizedQuery,
      data: sanitizedInputData,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  }

  /**
   * Destroy a record.
   */
  async delete(ctx: Koa.Context) {
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    await this.strapi.service(this.uid).delete(id, sanitizedQuery);

    ctx.status = 204;
  }
}
