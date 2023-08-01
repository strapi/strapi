import compress from 'koa-compress';
import { MiddlewareFactory } from './types';

export type Config = compress.CompressOptions;

export const compression: MiddlewareFactory<Config> = (config) => compress(config);
