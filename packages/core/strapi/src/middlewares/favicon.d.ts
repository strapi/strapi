import koaFavicon from 'koa-favicon';
import type { Common } from '../types';
export type Config = NonNullable<Parameters<typeof koaFavicon>[1]>;
export declare const favicon: Common.MiddlewareFactory<Config>;
