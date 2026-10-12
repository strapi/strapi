import { isObject } from 'lodash';
import { errors } from '@strapi/utils';
import type { Struct, Core, UID } from '@strapi/types';
import type Koa from 'koa';

import { CoreController } from './core-controller';

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export class SingleTypeController
  extends CoreController<Struct.SingleTypeSchema>
  implements Core.CoreAPI.Controller.SingleType
{
  private get uid() {
    return this.contentType.uid as UID.Service;
  }

  /**
   * Retrieve single type content
   *
   */
  async find(ctx: Koa.Context) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const entity = await this.strapi.service(this.uid).find(sanitizedQuery);

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  }

  /**
   * create or update single type content.
   */
  async update(ctx: Koa.Context) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const { body = {} as any } = ctx.request;

    if (!isObject(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }

    await this.validateInput(body.data, ctx);

    const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

    const entity = await this.strapi.service(this.uid).createOrUpdate({
      ...sanitizedQuery,
      data: sanitizedInputData,
    });

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  }

  async delete(ctx: Koa.Context) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    await this.strapi.service(this.uid).delete(sanitizedQuery);

    ctx.status = 204;
  }
}
