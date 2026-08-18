import * as sift from 'sift';
import qs from 'qs';
import { AbilityBuilder, Ability } from '@casl/ability';
import { pick, isNil, isObject } from 'lodash/fp';
import type { ParametrizedAction, PermissionRule } from '../../types';

export interface CustomAbilityBuilder {
  can(permission: PermissionRule): ReturnType<AbilityBuilder<Ability>['can']>;
  buildParametrizedAction: (parametrizedAction: ParametrizedAction) => string;
  build(): Ability;
}

const allowedOperations = [
  '$or',
  '$and',
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$exists',
  '$elemMatch',
] as const;

const operations = pick(allowedOperations, sift);

const allowedOperationLookup: Record<string, true> = Object.fromEntries(
  allowedOperations.map((operation) => [operation, true])
);

/**
 * Operators whose operands sift evaluates as nested queries, so their contents
 * must keep being validated. Every other allowed operator takes a literal operand
 * that sift never interprets as a query (e.g. `{ $eq: { $custom: true } }`, where
 * `$custom` is data), so those operands are left untouched to preserve sift's
 * matching behavior.
 */
const subQueryOperators: Record<string, true> = {
  $or: true,
  $and: true,
  $elemMatch: true,
};

/**
 * Reject condition operators sift can't match in memory (e.g. `$startsWith`),
 * validating keys only where sift interprets them as operators.
 */
const assertSupportedOperators = (conditions: unknown): void => {
  if (Array.isArray(conditions)) {
    conditions.forEach(assertSupportedOperators);
    return;
  }

  if (!isObject(conditions)) {
    return;
  }

  for (const [key, value] of Object.entries(conditions as Record<string, unknown>)) {
    if (key.startsWith('$')) {
      if (!allowedOperationLookup[key]) {
        throw new Error(
          `RBAC condition uses unsupported operator "${key}". Conditions are matched in memory and support only: ${allowedOperations.join(
            ', '
          )}.`
        );
      }

      // Only structural operators carry nested queries. Value operators
      // (`$eq`, `$in`, ...) take literal operands where `$`-prefixed keys are
      // data, so descending would reject conditions sift accepts.
      if (subQueryOperators[key]) {
        assertSupportedOperators(value);
      }

      continue;
    }

    // Regular field key: its value may hold nested operators to validate.
    assertSupportedOperators(value);
  }
};

const conditionsMatcher = (conditions: unknown) => {
  assertSupportedOperators(conditions);
  return sift.createQueryTester(conditions, { operations });
};

const buildParametrizedAction = ({ name, params }: ParametrizedAction) => {
  return `${name}?${qs.stringify(params)}`;
};

/**
 * Casl Ability Builder.
 */
export const caslAbilityBuilder = (): CustomAbilityBuilder => {
  const { can, build, ...rest } = new AbilityBuilder(Ability);

  return {
    can(permission: PermissionRule) {
      const { action, subject, properties = {}, condition } = permission;
      const { fields } = properties;

      const caslAction = typeof action === 'string' ? action : buildParametrizedAction(action);

      return can(
        caslAction,
        isNil(subject) ? 'all' : subject,
        fields,
        isObject(condition) ? condition : undefined
      );
    },

    buildParametrizedAction({ name, params }: ParametrizedAction) {
      return `${name}?${qs.stringify(params)}`;
    },

    build() {
      const ability = build({ conditionsMatcher });

      function decorateCan(originalCan: Ability['can']) {
        return function canWithParametrizedAction(...args: Parameters<Ability['can']>) {
          const [action, ...rest] = args;
          const caslAction = typeof action === 'string' ? action : buildParametrizedAction(action);

          // Call the original `can` method
          return originalCan.apply(ability, [caslAction, ...rest]);
        };
      }

      ability.can = decorateCan(ability.can);
      return ability;
    },

    ...rest,
  };
};
