'use strict';

const { pick, pipe, isNil } = require('lodash/fp');

const {
  convertSortQueryParams,
  convertLimitQueryParams,
  convertStartQueryParams,
  convertPopulateQueryParams,
  convertFiltersQueryParams,
  convertFieldsQueryParams,
} = require('@strapi/utils/lib/convert-query-params');

const { contentTypes: contentTypesUtils } = require('@strapi/utils');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

// TODO: to remove once the front is migrated
const convertOldQuery = params => {
  const query = {};

  Object.keys(params).forEach(key => {
    if (key.startsWith('_')) {
      query[key.slice(1)] = params[key];
    } else {
      query[key] = params[key];
    }
  });

  return query;
};

const transformCommonParams = (params = {}) => {
  const { _q, sort, filters, _where, fields, populate, ...query } = params;

  if (_q) {
    query._q = _q;
  }

  if (sort) {
    query.orderBy = convertSortQueryParams(sort);
  }

  if (filters) {
    query.where = convertFiltersQueryParams(filters);
  }

  if (_where) {
    query.where = {
      $and: [_where].concat(query.where || []),
    };
  }

  if (fields) {
    query.select = convertFieldsQueryParams(fields);
  }

  if (populate) {
    query.populate = convertPopulateQueryParams(populate);
  }

  return { ...convertOldQuery(query), ...query };
};

const transformPaginationParams = (params = {}) => {
  const { page, pageSize, start, limit, ...query } = params;

  const isPagePagination = !isNil(page) || !isNil(pageSize);
  const isOffsetPagination = !isNil(start) || !isNil(limit);

  if (isPagePagination && isOffsetPagination) {
    throw new Error(
      'Invalid pagination attributes. You cannot use page and offset pagination in the same query'
    );
  }

  if (page) {
    query.page = Number(page);
  }

  if (pageSize) {
    query.pageSize = Number(pageSize);
  }

  if (start) {
    query.offset = convertStartQueryParams(start);
  }

  if (limit) {
    query.limit = convertLimitQueryParams(limit);
  }

  return { ...convertOldQuery(query), ...query };
};

const transformPublicationStateParams = uid => (params = {}) => {
  const contentType = strapi.getModel(uid);

  if (!contentType) {
    return params;
  }

  const { publicationState, ...query } = params;

  if (publicationState && contentTypesUtils.hasDraftAndPublish(contentType)) {
    const { publicationState = 'live' } = params;

    const liveClause = {
      [PUBLISHED_AT_ATTRIBUTE]: {
        $notNull: true,
      },
    };

    if (publicationState === 'live') {
      query.where = {
        $and: [liveClause].concat(query.where || []),
      };

      // TODO: propagate nested publicationState filter somehow
    }
  }

  return { ...convertOldQuery(query), ...query };
};

const pickSelectionParams = pick(['fields', 'populate']);

const transformParamsToQuery = (uid, params) => {
  return pipe(
    // _q, _where, filters, etc...
    transformCommonParams,
    // page, pageSize, start, limit
    transformPaginationParams,
    // publicationState
    transformPublicationStateParams(uid)
  )(params);
};

module.exports = {
  transformCommonParams,
  transformPublicationStateParams,
  transformPaginationParams,
  transformParamsToQuery,
  pickSelectionParams,
};
