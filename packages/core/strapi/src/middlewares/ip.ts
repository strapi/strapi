import koaIp from 'koa-ip';
import type { MiddlewareFactory } from './types';

export type Config = koaIp.KoaIPOptions;

export const ip: MiddlewareFactory<Config> = (config) => koaIp(config);
