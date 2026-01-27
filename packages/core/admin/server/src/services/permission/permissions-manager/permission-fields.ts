import { detectSubjectType } from '@casl/ability';
import { permittedFieldsOf } from '@casl/ability/extra';
import { isEmpty, isNil, flatMap, some, prop } from 'lodash/fp';

import type { Ability } from '@casl/ability';

export interface PermissionFieldsResult {
  permittedFields: string[];
  hasAtLeastOneRegistered: boolean;
  shouldIncludeAll: boolean;
}

/**
 * Creates a cached permission fields calculator for a given CASL ability.
 *
 * The cache stores permission field calculations per action+subjectType combination.
 * Results are only cached when rules have no entity-specific conditions, as those
 * must be computed per entity.
 *
 * @param ability - The CASL ability instance to use for permission checks
 * @returns Object with getPermissionFields function and cache
 */
export const createPermissionFieldsCache = (ability: Ability) => {
  const permissionCache = new Map<string, PermissionFieldsResult>();

  const getPermissionFields = (actionOverride: string, subject: any): PermissionFieldsResult => {
    const subjectType = detectSubjectType(subject);
    const rules = ability.rulesFor(actionOverride, subjectType);

    // Check if any rule has conditions that depend on entity data
    // If so, we can't cache - must compute per entity
    const hasEntityConditions = rules.some(
      (rule: any) => rule.conditions && !isEmpty(rule.conditions)
    );

    // Return cached result if available and safe to use
    const cacheKey = `${actionOverride}::${String(subjectType)}`;
    if (!hasEntityConditions && permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!;
    }

    // Compute permission fields (expensive CASL operation)
    const permittedFields = permittedFieldsOf(ability, actionOverride, subject, {
      fieldsFrom: (rule) => rule.fields || [],
    });

    const hasAtLeastOneRegistered = some(
      (fields) => !isNil(fields),
      flatMap(prop('fields'), rules)
    );
    const shouldIncludeAll = isEmpty(permittedFields) && !hasAtLeastOneRegistered;

    const result: PermissionFieldsResult = {
      permittedFields,
      hasAtLeastOneRegistered,
      shouldIncludeAll,
    };

    // Cache for reuse if no entity-specific conditions
    if (!hasEntityConditions) {
      permissionCache.set(cacheKey, result);
    }

    return result;
  };

  return {
    getPermissionFields,
    clearCache: () => permissionCache.clear(),
  };
};
