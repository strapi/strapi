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
const createValidateContext = (permission: Permission): ValidateContext => ({
  get permission(): Readonly<Permission> {
    return clonePermission(permission);
  },
});

/**
 * Create a context from a domain {@link Permission} used by the before valuate hook
 */
const createBeforeEvaluateContext = (permission: Permission): BeforeEvaluateContext => ({
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
const createWillRegisterContext = ({
  permission,
  options,
}: WillRegisterContextParams): WillRegisterContext => ({
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

/** A permission whose properties a typed handler reads as `unknown`. */
export type TypedPermission = Omit<Permission, 'properties'> & {
  properties?: Record<string, unknown>;
};

/** The context of `before-format::validate.permission` and `before-evaluate.permission`. */
export interface BeforeEvaluateContext {
  /** A copy of the permission. */
  readonly permission: Readonly<TypedPermission>;
  /** Adds a condition to the permission. */
  addCondition(condition: string): BeforeEvaluateContext;
}

/** The context of `after-format::validate.permission`. */
export interface ValidateContext {
  /** A copy of the permission. */
  readonly permission: Readonly<TypedPermission>;
}

/** Builds the CASL condition of the permission being registered. */
export interface WillRegisterCondition {
  and(rawConditionObject: unknown): WillRegisterCondition;
  or(rawConditionObject: unknown): WillRegisterCondition;
}

/**
 * The context of `before-register.permission`: the options given to `generateAbility`, spread, with
 * the permission and the condition builder.
 */
export type WillRegisterContext = {
  readonly [option: string]: unknown;
  /** A copy of the permission. */
  readonly permission: PermissionRule;
  readonly condition: WillRegisterCondition;
};

/**
 * The engine hooks with typed handlers. {@link PermissionEngineHooks}, what the engine exposes,
 * keeps untyped handlers; a typed contract can declare this map instead. A validate handler
 * rejects the permission by returning `false`.
 */
export interface TypedPermissionEngineHooks {
  'before-format::validate.permission': hooks.AsyncBailHook<
    (context: BeforeEvaluateContext) => unknown
  >;
  'format.permission': hooks.AsyncSeriesWaterfallHook<
    (permission: TypedPermission) => TypedPermission | Promise<TypedPermission>
  >;
  'after-format::validate.permission': hooks.AsyncBailHook<(context: ValidateContext) => unknown>;
  'before-evaluate.permission': hooks.AsyncSeriesHook<(context: BeforeEvaluateContext) => unknown>;
  'before-register.permission': hooks.AsyncSeriesHook<(context: WillRegisterContext) => unknown>;
}

export {
  createEngineHooks,
  createValidateContext,
  createBeforeEvaluateContext,
  createWillRegisterContext,
};
