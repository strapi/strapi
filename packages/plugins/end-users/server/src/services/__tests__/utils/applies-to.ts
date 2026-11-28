import type { Modules } from '@strapi/types';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  typeof (value as { then?: unknown }).then === 'function';

/**
 * A stand-in for `strapi.contentAPI.permissions.conditions.appliesTo`, which the plugin asks and
 * these tests' fake of Strapi has to answer the way core does (`appliesTo` in core's
 * `content-api/permissions/conditions.ts`): no `subjects` is every type, a list names its types, and
 * a function says so, one that throws or is async counting as no.
 */
export const appliesTo = (definition: ContentApiConditionDefinition, uid: string): boolean => {
  const { subjects } = definition;

  if (subjects === undefined) {
    return true;
  }

  if (typeof subjects === 'function') {
    try {
      const applies: unknown = subjects(uid);

      if (isThenable(applies)) {
        // Nobody reads what it settles to, so a rejection is handled and dropped, as in core
        Promise.resolve(applies).catch(() => {});

        return false;
      }

      return Boolean(applies);
    } catch {
      return false;
    }
  }

  return Array.isArray(subjects) && subjects.includes(uid);
};
