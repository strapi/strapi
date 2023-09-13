import type { Context } from 'koa';
import { Strapi } from '../../../../..';

export type ControllerReturnType = {
  [key: string]: (ctx: Context) => Promise<unknown> | unknown;
};

export type Controller = ({ strapi }: { strapi: Strapi }) => ControllerReturnType;

export interface Controllers {
  [key: string]: Controller;
}
