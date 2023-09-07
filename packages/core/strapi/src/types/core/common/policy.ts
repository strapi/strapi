import { ExtendableContext } from 'koa';
import type { Strapi } from '@strapi/typings';

export type PolicyContext = Omit<ExtendableContext, 'is'> & {
  type: string;
  is(name: string): boolean;
};

export type Policy<T = unknown> = (
  ctx: PolicyContext,
  cfg: T,
  { strapi }: { strapi: Strapi }
) => boolean | undefined;
