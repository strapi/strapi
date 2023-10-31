/* eslint-disable @typescript-eslint/default-param-last */
import _ from 'lodash';
import { cloneDeep, isPlainObject } from 'lodash/fp';
import { subject as asSubject } from '@casl/ability';
import createSanitizeHelpers from './sanitize';
import createValidateHelpers from './validate';

import { buildStrapiQuery, buildCaslQuery } from './query-builders';

export default ({ ability, action, model }: any) => ({
  ability,
  action,
  model,

  get isAllowed(): any {
    return this.ability.can(action, model);
  },

  toSubject(target: any, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data: any, options = {}) {
    return this.sanitizeInput(data, options);
  },

  getQuery(queryAction = action) {
    if (_.isUndefined(queryAction)) {
      throw new Error('Action must be defined to build a permission query');
    }

    return buildStrapiQuery(buildCaslQuery(ability, queryAction, model));
  },

  addPermissionsQueryTo(query = {} as any, action: any) {
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

  ...createSanitizeHelpers({ action, ability, model }),
  ...createValidateHelpers({ action, ability, model }),
});
