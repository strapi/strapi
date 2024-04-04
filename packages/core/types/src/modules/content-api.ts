import permissions from '@strapi/permissions';
import { providerFactory, sanitize, validate } from '@strapi/utils';

import type { Route } from '../core';

export interface Condition {
  name: string;
  [key: string]: unknown;
}

type ConditionProvider = {
  register: (condition: Condition) => Promise<void>;
} & ReturnType<typeof providerFactory>;

type ActionProvider = {
  register: (action: string, payload: Record<string, unknown>) => Promise<void>;
} & ReturnType<typeof providerFactory>;

export interface PermissionUtilities {
  engine: ReturnType<typeof permissions.engine.new>;
  providers: {
    action: ActionProvider;
    condition: ConditionProvider;
  };
  registerActions: () => Promise<void>;
  getActionsMap: () => Record<
    string,
    {
      controllers: Record<string, string[]>;
    }
  >;
}

export interface ContentApi {
  permissions: PermissionUtilities;
  getRoutesMap: () => Promise<Record<string, Route[]>>;
  sanitize: sanitize.APISanitiers;
  validate: validate.APIValidators;
}
