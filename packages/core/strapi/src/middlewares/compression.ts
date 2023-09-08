import compress from 'koa-compress';
import type { Common } from '@strapi/typings';

export type Config = compress.CompressOptions;

export const compression: Common.MiddlewareFactory<Config> = (config) => compress(config);
