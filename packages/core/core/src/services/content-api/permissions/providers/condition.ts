import { isPlainObject } from 'lodash';
import { providerFactory } from '@strapi/utils';
import type { Modules } from '@strapi/types';

import { applyCondition, freezeConditionDefinition } from '../conditions';
import type { BoundCondition, ConditionRef, ContentApiConditionDefinition } from '../conditions';

/**
 * The Content API conditions registry, keyed by condition name.
 *
 * Permission rows name a condition with the params it binds (`{ name, params }`), so `get` takes
 * that ref and gives a handler bound to those params, which the permission engine calls once per
 * row with `{ user, permission }`. The handler is `applyCondition`: false for a caller the condition
 * denies, for a definition whose `stamp` or `lockedFields` gives the wrong shape, so a malformed
 * condition never keeps its filter while its locks are dropped, and for one whose functions throw
 * (logged once per name): a buggy condition denies its row, it never fails the ability
 * build. A name nobody registered gives undefined, which the engine skips: a row whose every
 * condition is skipped or false gets no rule.
 *
 * `register` stores a validated, frozen copy of the definition, so nobody can change a registered
 * condition afterwards. To use a condition for a caller (its filter, stamp and locked fields) pass
 * what `get` gives to `applyCondition`.
 */
export default (options = {}) => {
  const provider = providerFactory<ContentApiConditionDefinition>(options);

  const get = (ref: ConditionRef): BoundCondition | undefined => {
    const { name, params } =
      typeof ref === 'string' ? { name: ref, params: undefined } : (ref ?? {});
    const definition = typeof name === 'string' ? provider.get(name) : undefined;

    if (definition === undefined) {
      return undefined;
    }

    const bound = isPlainObject(params) ? { ...params } : {};

    return {
      name: definition.name,
      definition,
      params: bound,
      handler({ user = null, permission }) {
        const uid = permission?.subject;

        if (typeof uid !== 'string') {
          return false;
        }

        // Through `applyCondition`, as the checker reads the same condition, so a definition whose
        // `stamp` or `lockedFields` is malformed is false here too. Reading `query` alone would keep
        // the filter of such a condition while the checker drops its locks and stamp.
        const applied = applyCondition(
          { definition, params: bound },
          { user, uid, now: new Date() }
        );

        if (applied === false) {
          return false;
        }

        // An empty filter restricts nothing: the engine then registers the rule without a condition
        return Object.keys(applied.filter).length === 0 ? true : applied.filter;
      },
    };
  };

  return {
    ...provider,

    async register(definition: ContentApiConditionDefinition): Promise<void> {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new conditions outside the bootstrap function.`);
      }

      const frozen = freezeConditionDefinition(definition);

      await provider.register(frozen.name, frozen);
    },

    get,

    // The registry's own `delete` reads the item through `this.get`, which is the bound `get` here
    delete: (name: string) => provider.delete(name),
    clear: () => provider.clear(),
  } satisfies Modules.ContentAPI.ConditionProvider;
};
