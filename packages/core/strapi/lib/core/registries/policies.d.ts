import { BaseContext } from 'koa';
import { Strapi } from '../../';

interface PolicyContext extends BaseContext {
  type: string;
  is(name): boolean;
}

export type Policy = (ctx: PolicyContext, { strapi: Strapi }) => boolean | undefined;
