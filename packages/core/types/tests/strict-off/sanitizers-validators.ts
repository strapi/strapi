import type { sanitize, validate } from '@strapi/utils';

import type { Modules } from '../../src';
import type { Equal, Expect } from './helpers';

// Without strict types, the sanitizer and validator registries' `set` takes an array, as on develop.
type SetValueChecks = [
  Expect<
    Equal<
      Parameters<Modules.Sanitizers.SanitizersRegistry['set']>[1],
      sanitize.Sanitizer[] | undefined
    >
  >,
  Expect<
    Equal<
      Parameters<Modules.Validators.ValidatorsRegistry['set']>[1],
      validate.Validator[] | undefined
    >
  >,
];
declare const setValueChecks: SetValueChecks;
setValueChecks satisfies unknown;
