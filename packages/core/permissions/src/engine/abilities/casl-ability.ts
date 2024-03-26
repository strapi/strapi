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

const conditionsMatcher = (conditions: unknown) => {
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
        return function (...args: Parameters<Ability['can']>) {
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
