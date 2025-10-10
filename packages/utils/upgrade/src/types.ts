import type { Logger } from './modules/logger';

export type MaybePromise<T> = Promise<T> | T;

export interface ContextWithLogger {
  logger: Logger;
}
