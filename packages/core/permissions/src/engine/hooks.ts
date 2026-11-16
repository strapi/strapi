import { has, isPlainObject } from 'lodash';
import { hooks } from '@strapi/utils';

import * as domain from '../domain';
import type { Permission } from '../domain/permission';
import type { PermissionRule } from '../types';

export interface PermissionEngineHooks {
  'before-format::validate.permission': ReturnType<typeof hooks.createAsyncBailHook>;
  'format.permission': ReturnType<typeof hooks.createAsyncSeriesWaterfallHook>;
  'after-format::validate.permission': ReturnType<typeof hooks.createAsyncBailHook>;
  'before-evaluate.permission': ReturnType<typeof hooks.createAsyncSeriesHook>;
  'before-register.permission': ReturnType<typeof hooks.createAsyncSeriesHook>;
}

export type HookName = keyof PermissionEngineHooks;

const clonePermission = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(clonePermission) as T;
  }

  if (isPlainObject(value)) {
    const copy: Record<string, unknown> = {};

    for (const key of Object.keys(value as object)) {
      copy[key] = clonePermission((value as Record<string, unknown>)[key]);
    }

    return copy as T;
  }

  return value;
};

/**
 * Create a hook map used by the permission Engine
 */
const createEngineHooks = (): PermissionEngineHooks => ({
  'before-format::validate.permission': hooks.createAsyncBailHook(),
  'format.permission': hooks.createAsyncSeriesWaterfallHook(),
  'after-format::validate.permission': hooks.createAsyncBailHook(),
  'before-evaluate.permission': hooks.createAsyncSeriesHook(),
  'before-register.permission': hooks.createAsyncSeriesHook(),
});

/**
 * Create a context from a domain {@link Permission} used by the validate hooks
 */
const createValidateContext = (permission: Permission) => ({
  get permission(): Readonly<Permission> {
    return clonePermission(permission);
  },
});

/**
 * Create a context from a domain {@link Permission} used by the before valuate hook
 */
const createBeforeEvaluateContext = (permission: Permission) => ({
  get permission(): Readonly<Permission> {
    return clonePermission(permission);
  },

  addCondition(condition: string) {
    Object.assign(permission, domain.permission.addCondition(condition, permission));

    return this;
  },
});

interface WillRegisterContextParams {
  permission: PermissionRule;
  options: Record<string, unknown>;
}

/**
 * Create a context from a casl Permission & some options
 * @param caslPermission
 */
const createWillRegisterContext = ({ permission, options }: WillRegisterContextParams) => ({
  ...options,

  get permission() {
    return clonePermission(permission);
  },

  condition: {
    and(rawConditionObject: unknown) {
      if (!permission.condition) {
        permission.condition = { $and: [] };
      }

      if (Array.isArray(permission.condition.$and)) {
        permission.condition.$and.push(rawConditionObject);
      }

      return this;
    },

    or(rawConditionObject: unknown) {
      if (!permission.condition) {
        permission.condition = { $and: [] };
      }

      if (Array.isArray(permission.condition.$and)) {
        const orClause = permission.condition.$and.find((clause) => has(clause, '$or'));

        if (orClause) {
          orClause.$or.push(rawConditionObject);
        } else {
          permission.condition.$and.push({ $or: [rawConditionObject] });
        }
      }

      return this;
    },
  },
});

export {
  createEngineHooks,
  createValidateContext,
  createBeforeEvaluateContext,
  createWillRegisterContext,
};
