import compress from 'koa-compress';
import type { Common } from '@strapi/types';

export type Config = compress.CompressOptions;

export const compression: Common.MiddlewareFactory<Config> = (config) => compress(config);
