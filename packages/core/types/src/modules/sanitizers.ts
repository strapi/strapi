import type { sanitize } from '@strapi/utils';

import type { IsStrict } from '../core/strictness';

/**
 * What `set` stores at a path with strict types: sanitizers, or a map of the paths below it. The
 * registry sets the value with lodash `set`, and the loaders set `content-api` to a map of
 * empty lists (`packages/core/core/src/loaders/sanitizers.ts`).
 */
type SanitizerTree = sanitize.Sanitizer[] | { [path: string]: SanitizerTree };

export interface SanitizersRegistry {
  get(path: string): sanitize.Sanitizer[];
  add(path: string, sanitizer: sanitize.Sanitizer): this;
  set(path: string, value?: IsStrict extends false ? sanitize.Sanitizer[] : SanitizerTree): this;
  has(path: string): boolean;
}
