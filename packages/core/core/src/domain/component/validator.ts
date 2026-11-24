import _ from 'lodash';
import { LIFECYCLES, type Lifecycle } from '../lifecycles';

type LifecycleHook = (...args: any[]) => unknown;

export type ComponentLifecycles = Partial<Record<Lifecycle, LifecycleHook>>;

interface ValidatedComponentLifecycles {
  lifecycles: ComponentLifecycles;
  /** What the loader logs: each case was accepted silently before. */
  warnings: string[];
}

const isLifecycle = (key: string): key is Lifecycle =>
  (LIFECYCLES as readonly string[]).includes(key);

// Exports named like a hook but unknown are most likely typos; other exports (helpers) are not
const LOOKS_LIKE_A_HOOK = /^(before|after)[A-Z]/;

const DELETE_MANY_HOOKS = new Set<string>(['beforeDeleteMany', 'afterDeleteMany']);

/**
 * Validates the lifecycles of a component: the module next to its schema
 * (`src/components/<category>/<name>.lifecycles.js`) or the `lifecycles` of a `.js` schema.
 *
 * Both were already attached to the model without any check, so only what can never have worked
 * fails: lifecycles that are not an object, or a hook that is not a function. Other exports are
 * left out, with a warning when they look like a misspelled hook.
 */
const validateComponentLifecycles = (
  uid: string,
  lifecycles: unknown
): ValidatedComponentLifecycles => {
  if (!_.isObjectLike(lifecycles) || Array.isArray(lifecycles)) {
    throw new Error(
      `Component lifecycles are invalid for ${uid}: they must be an object of hooks.`
    );
  }

  const valid: ComponentLifecycles = {};
  const warnings: string[] = [];

  for (const [key, hook] of Object.entries(lifecycles as Record<string, unknown>)) {
    if (!isLifecycle(key)) {
      if (LOOKS_LIKE_A_HOOK.test(key)) {
        warnings.push(`"${key}" is not a lifecycle hook and is ignored`);
      }

      continue;
    }

    if (hook === null || hook === undefined) {
      continue;
    }

    if (typeof hook !== 'function') {
      throw new Error(`Component lifecycles are invalid for ${uid}: "${key}" must be a function.`);
    }

    if (DELETE_MANY_HOOKS.has(key)) {
      // Any delete hook makes the document service delete components row by row (see
      // `DELETE_LIFECYCLES`), so this one never gets a `deleteMany` to run on
      warnings.push(
        `"${key}" never runs when the document service deletes this component, only on a direct deleteMany query on it`
      );
    }

    valid[key] = hook as LifecycleHook;
  }

  return { lifecycles: valid, warnings };
};

export { validateComponentLifecycles };
