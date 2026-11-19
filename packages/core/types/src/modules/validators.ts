import type { validate } from '@strapi/utils';

import type { IsStrict } from '../core/strictness';

/**
 * What `set` stores at a path with strict types: validators, or a map of the paths below it. The
 * registry sets the value with lodash `set`, and the loaders set `content-api` to a map of
 * empty lists (`packages/core/core/src/loaders/validators.ts`).
 */
type ValidatorTree = validate.Validator[] | { [path: string]: ValidatorTree };

export interface ValidatorsRegistry {
  get(path: string): validate.Validator[];
  add(path: string, validator: validate.Validator): this;
  set(path: string, value?: IsStrict extends false ? validate.Validator[] : ValidatorTree): this;
  has(path: string): boolean;
}
