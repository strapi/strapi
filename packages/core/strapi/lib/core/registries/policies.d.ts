import { ExtendableContext } from 'koa';
import { Strapi } from '../../';

interface PolicyContext extends ExtendableContext {
  type: string;
  is(name: string): boolean;
}

export type Policy<T = unknown> = (
  ctx: PolicyContext,
  cfg: T,
  { strapi: Strapi }
) => boolean | undefined;
