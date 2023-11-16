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

  get isAllowed(): unknown {
    return this.ability.can(action, model);
  },

  toSubject(target: any, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data: unknown, options = {}) {
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

  ...createSanitizeHelpers({ action, ability, model }),
  ...createValidateHelpers({ action, ability, model }),
});
