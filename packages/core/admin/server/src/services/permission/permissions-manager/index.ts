import _ from 'lodash';
import { cloneDeep, isPlainObject } from 'lodash/fp';
import { subject as asSubject } from '@casl/ability';
import type { Core } from '@strapi/types';
import { withAdminPermissionsSpan } from '@strapi/utils';

import createSanitizeHelpers from './sanitize';
import createValidateHelpers from './validate';

import { buildStrapiQuery, buildCaslQuery } from './query-builders';

/** Explicit shape for controllers — inferred literals lose spread keys from wrapped helpers. */
export interface PermissionsManagerInstance {
  ability: any;
  action: any;
  model: any;
  readonly isAllowed: unknown;
  toSubject(target: any, subjectType?: any): any;
  pickPermittedFieldsOf(data: unknown, options?: unknown): Promise<unknown>;
  getQuery(queryAction?: any): unknown;
  addPermissionsQueryTo(query?: any, action?: unknown): any;
  sanitizeOutput(data: unknown, options?: unknown): Promise<unknown>;
  sanitizeInput(data: unknown, options?: unknown): Promise<unknown>;
  sanitizeQuery(data: unknown, options?: unknown): Promise<unknown>;
  validateQuery(data: unknown, options?: unknown): Promise<unknown>;
  validateInput(data: unknown, options?: unknown): Promise<unknown>;
}

function adminPermissionSpanName(methodKey: string): string {
  if (methodKey.startsWith('sanitize')) {
    const rest = methodKey.slice('sanitize'.length);
    const sub = `${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
    return `strapi.admin.permissions.sanitize.${sub}`;
  }
  if (methodKey.startsWith('validate')) {
    const rest = methodKey.slice('validate'.length);
    const sub = `${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
    return `strapi.admin.permissions.validate.${sub}`;
  }
  return `strapi.admin.permissions.${methodKey}`;
}

function wrapPermissionPhaseHelpers(
  helpers: Record<string, (...args: any[]) => Promise<any>>,
  spanAttributes: Record<string, string | number | boolean | undefined>,
  strapiInstance: Core.Strapi | undefined
): Record<string, (...args: any[]) => Promise<any>> {
  const wrapped: Record<string, (...args: any[]) => Promise<any>> = {};

  for (const key of Object.keys(helpers)) {
    const fn = helpers[key];
    const spanName = adminPermissionSpanName(key);
    wrapped[key] = (...args: any[]) =>
      withAdminPermissionsSpan(strapiInstance, spanName, spanAttributes, () => fn(...args));
  }

  return wrapped;
}

export default ({ ability, action, model }: any) => {
  const spanAttributes: Record<string, string | number | boolean | undefined> = {};
  if (typeof model === 'string') {
    spanAttributes['strapi.content_type.uid'] = model;
  }
  if (typeof action === 'string') {
    spanAttributes['strapi.permission.action'] = action;
  }

  const strapiInstance = strapi as Core.Strapi | undefined;

  const sanitizeHelpers = wrapPermissionPhaseHelpers(
    createSanitizeHelpers({ action, ability, model }),
    spanAttributes,
    strapiInstance
  );
  const validateHelpers = wrapPermissionPhaseHelpers(
    createValidateHelpers({ action, ability, model }),
    spanAttributes,
    strapiInstance
  );

  return {
    ability,
    action,
    model,

    get isAllowed(): unknown {
      return this.ability.can(action, model);
    },

    toSubject(target: any, subjectType = model) {
      return asSubject(subjectType, target);
    },

    ...sanitizeHelpers,
    ...validateHelpers,

    pickPermittedFieldsOf(data: unknown, options = {}): Promise<unknown> {
      return this.sanitizeInput(data, options);
    },

    getQuery(queryAction = action) {
      if (_.isUndefined(queryAction)) {
        throw new Error('Action must be defined to build a permission query');
      }

      return buildStrapiQuery(buildCaslQuery(ability, queryAction, model));
    },

    // eslint-disable-next-line @typescript-eslint/default-param-last
    addPermissionsQueryTo(query = {} as any, action: unknown) {
      const newQuery = cloneDeep(query);
      const permissionQuery = this.getQuery(action) ?? undefined;

      if (isPlainObject(query.filters)) {
        newQuery.filters = permissionQuery
          ? { $and: [query.filters, permissionQuery] }
          : query.filters;
      } else {
        newQuery.filters = permissionQuery;
      }

      return newQuery;
    },
  } as PermissionsManagerInstance;
};
