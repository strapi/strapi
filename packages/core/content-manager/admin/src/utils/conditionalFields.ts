import { type JsonLogicCondition } from '@strapi/admin/strapi-admin';

import { getIn } from './objects';

const CONDITIONAL_FIELD_STATIC_SUBSCRIPTION = '__strapi_conditional_static__';
const CONDITIONAL_FIELD_MULTI_DEP_SEPARATOR = '||';

const serializeConditionDependency = (value: unknown) => {
  try {
    return `${typeof value}:${JSON.stringify(value)}`;
  } catch {
    return `${typeof value}:${String(value)}`;
  }
};

/**
 * `null` means "fallback to broad subscription" because we couldn't safely infer
 * dependency paths from the condition.
 */
const getVarDependencyPath = (operand: unknown): string | null => {
  if (typeof operand === 'string') {
    return operand.length > 0 ? operand : null;
  }

  if (Array.isArray(operand)) {
    const [path] = operand;

    if (typeof path === 'string') {
      return path.length > 0 ? path : null;
    }

    return null;
  }

  return null;
};

const getConditionDependencyPaths = (condition: JsonLogicCondition): string[] | null => {
  const dependencies = new Set<string>();

  const collectDependencies = (value: unknown): boolean => {
    if (Array.isArray(value)) {
      return value.every(collectDependencies);
    }

    if (value === null || typeof value !== 'object') {
      return true;
    }

    return Object.entries(value).every(([key, operand]) => {
      if (key === 'var') {
        const dependencyPath = getVarDependencyPath(operand);

        if (dependencyPath === null) {
          return false;
        }

        if (dependencyPath) {
          dependencies.add(dependencyPath);
        }

        return true;
      }

      return collectDependencies(operand);
    });
  };

  return collectDependencies(condition) ? [...dependencies].sort() : null;
};

const getConditionDependencySubscriptionValue = (
  values: unknown,
  conditionDependencyPaths: string[] | null
) => {
  if (conditionDependencyPaths === null) {
    return values;
  }

  if (conditionDependencyPaths.length === 0) {
    return CONDITIONAL_FIELD_STATIC_SUBSCRIPTION;
  }

  if (conditionDependencyPaths.length === 1) {
    return serializeConditionDependency(getIn(values, conditionDependencyPaths[0]));
  }

  return conditionDependencyPaths
    .map((path) => serializeConditionDependency(getIn(values, path)))
    .join(CONDITIONAL_FIELD_MULTI_DEP_SEPARATOR);
};

export {
  CONDITIONAL_FIELD_MULTI_DEP_SEPARATOR,
  CONDITIONAL_FIELD_STATIC_SUBSCRIPTION,
  getConditionDependencyPaths,
  getConditionDependencySubscriptionValue,
  getVarDependencyPath,
  serializeConditionDependency,
};
