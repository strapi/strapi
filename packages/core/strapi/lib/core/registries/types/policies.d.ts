import { BaseContext } from 'koa';
import { Strapi } from '../../../../types';

interface PolicyContext extends BaseContext {
  type: string;
  is(name): boolean;
}

export type Policy = (ctx: PolicyContext, { strapi: Strapi }) => boolean | undefined;
