/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * The content-API action and condition providers replace the base provider's
 * `register(key, item)` with their own signature. `@ts-expect-error` marks the calls that must keep
 * failing.
 */
import type { providerFactory } from '@strapi/utils';

import type { Modules } from '../..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

type BaseProvider = ReturnType<typeof providerFactory>;
type Providers = Modules.ContentAPI.PermissionUtilities['providers'];

declare const condition: Providers['condition'];
declare const action: Providers['action'];

// The condition provider registers a condition definition, keyed by its name.
export const registeredCondition = condition.register({
  name: 'api::is-owner',
  displayName: 'Is owner',
  query: { author: { documentId: '$user.documentId' } },
});

// The base provider's `register(key, item)` is not available: at runtime, `'isOwner'` would be
// taken as the condition and the condition would be registered under an `undefined` name.
// @ts-expect-error - register takes a single condition definition
export const conditionWithKey = condition.register('isOwner', { name: 'isOwner' });

// The action provider registers an action with a record payload.
export const registeredAction = action.register('api::article.article.find', {});

// @ts-expect-error - the payload must be a record
export const actionWithScalarPayload = action.register('api::article.article.find', 42);

// `register` resolves to the base provider that the content-API provider wraps.
true satisfies Assert<IsEqual<typeof registeredCondition, Promise<BaseProvider>>>;
true satisfies Assert<IsEqual<typeof registeredAction, Promise<BaseProvider>>>;

// The other base provider methods are still available.
true satisfies Assert<IsEqual<ReturnType<typeof condition.keys>, string[]>>;
true satisfies Assert<IsEqual<ReturnType<typeof action.has>, boolean>>;
