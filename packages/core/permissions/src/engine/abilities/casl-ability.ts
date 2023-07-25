import * as sift from 'sift';
import { AbilityBuilder, Ability, Subject } from '@casl/ability';
import { pick, isNil, isObject } from 'lodash/fp';

export interface PermissionRule {
  action: string;
  subject?: Subject | null;
  properties?: {
    fields?: string[];
  };
  condition?: Record<string, unknown>;
}

export interface CustomAbilityBuilder {
  can(permission: PermissionRule): ReturnType<AbilityBuilder<Ability>['can']>;
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

/**
 * Casl Ability Builder.
 */
export const caslAbilityBuilder = (): CustomAbilityBuilder => {
  const { can, build, ...rest } = new AbilityBuilder(Ability);

  return {
    can(permission: PermissionRule) {
      const { action, subject, properties = {}, condition } = permission;
      const { fields } = properties;

      return can(
        action,
        isNil(subject) ? 'all' : subject,
        fields,
        isObject(condition) ? condition : undefined
      );
    },

    build() {
      return build({ conditionsMatcher });
    },

    ...rest,
  };
};
