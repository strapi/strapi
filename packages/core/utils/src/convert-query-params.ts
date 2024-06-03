/* eslint-disable max-classes-per-file */

/**
 * Converts the standard Strapi REST query params to a more usable format for querying
 * You can read more here: https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#filters
 */

import {
  isNil,
  toNumber,
  isInteger,
  isEmpty,
  isObject,
  cloneDeep,
  get,
  isArray,
  isString,
} from 'lodash/fp';
import _ from 'lodash';

import parseType from './parse-type';
import { PaginationError } from './errors';
import {
  isDynamicZoneAttribute,
  isMorphToRelationalAttribute,
  constants,
  hasDraftAndPublish,
} from './content-types';
import { Model } from './types';
import { isOperator } from './operators';

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE, PUBLISHED_AT_ATTRIBUTE } = constants;

type SortOrder = 'asc' | 'desc';

export interface SortMap {
  [key: string]: SortOrder | SortMap;
}

export interface SortParamsObject {
  [key: string]: SortOrder | SortParamsObject;
}
type SortParams = string | string[] | SortParamsObject | SortParamsObject[];
type FieldsParams = string | string[];

type FiltersParams = unknown;

export interface PopulateAttributesParams {
  [key: string]: boolean | PopulateObjectParams;
}
export interface PopulateObjectParams {
  sort?: SortParams;
  fields?: FieldsParams;
  filters?: FiltersParams;
  populate?: string | string[] | PopulateAttributesParams;
  on?: PopulateAttributesParams;
  count?: boolean;
  ordering?: unknown;
  _q?: string;
  limit?: number | string;
  start?: number | string;
  page?: number | string;
  pageSize?: number | string;
}

type PopulateParams = string | string[] | PopulateAttributesParams;

export interface Params {
  sort?: SortParams;
  fields?: FieldsParams;
  filters?: FiltersParams;
  populate?: PopulateParams;
  count?: boolean;
  ordering?: unknown;
  _q?: string;
  limit?: number | string;
  start?: number | string;
  page?: number | string;
  pageSize?: number | string;
  status?: 'draft' | 'published';
}

type FiltersQuery = (options: { meta: Model }) => WhereQuery | undefined;
type OrderByQuery = SortMap | SortMap[];
type SelectQuery = string | string[];
export interface WhereQuery {
  [key: string]: any;
}

type PopulateQuery =
  | boolean
  | string[]
  | {
      [key: string]: PopulateQuery;
    };

export interface Query {
  orderBy?: OrderByQuery;
  select?: SelectQuery;
  where?: WhereQuery;
  // NOTE: those are internal DB filters do not modify
  filters?: FiltersQuery;
  populate?: PopulateQuery;
  count?: boolean;
  ordering?: unknown;
  _q?: string;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

class InvalidOrderError extends Error {
  constructor() {
    super();
    this.message = 'Invalid order. order can only be one of asc|desc|ASC|DESC';
  }
}
class InvalidSortError extends Error {
  constructor() {
    super();
    this.message =
      'Invalid sort parameter. Expected a string, an array of strings, a sort object or an array of sort objects';
  }
}

function validateOrder(order: string): asserts order is SortOrder {
  if (!isString(order) || !['asc', 'desc'].includes(order.toLocaleLowerCase())) {
    throw new InvalidOrderError();
  }
}

const convertCountQueryParams = (countQuery: unknown): boolean => {
  return parseType({ type: 'boolean', value: countQuery });
};

const convertOrderingQueryParams = (ordering: unknown) => {
  return ordering;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => _.isPlainObject(value);
const isStringArray = (value: unknown): value is string[] =>
  isArray(value) && value.every(isString);

interface TransformerOptions {
  getModel: (uid: string) => Model | undefined;
}

const createTransformer = ({ getModel }: TransformerOptions) => {
  /**
   * Sort query parser
   */
  const convertSortQueryParams = (sortQuery: SortParams): OrderByQuery => {
    if (typeof sortQuery === 'string') {
      return convertStringSortQueryParam(sortQuery);
    }

    if (isStringArray(sortQuery)) {
      return sortQuery.flatMap((sortValue: string) => convertStringSortQueryParam(sortValue));
    }

    if (Array.isArray(sortQuery)) {
      return sortQuery.map((sortValue) => convertNestedSortQueryParam(sortValue));
    }

    if (isPlainObject(sortQuery)) {
      return convertNestedSortQueryParam(sortQuery);
    }

    throw new InvalidSortError();
  };

  const convertStringSortQueryParam = (sortQuery: string): SortMap[] => {
    return sortQuery.split(',').map((value) => convertSingleSortQueryParam(value));
  };

  const convertSingleSortQueryParam = (sortQuery: string): SortMap => {
    if (!sortQuery) {
      return {};
    }

    if (!isString(sortQuery)) {
      throw new Error('Invalid sort query');
    }

    // split field and order param with default order to ascending
    const [field, order = 'asc'] = sortQuery.split(':');

    if (field.length === 0) {
      throw new Error('Field cannot be empty');
    }

    validateOrder(order);

    // TODO: field should be a valid path on an object model

    return _.set({}, field, order);
  };

  const convertNestedSortQueryParam = (sortQuery: SortParamsObject): SortMap => {
    const transformedSort: SortMap = {};
    for (const field of Object.keys(sortQuery)) {
      const order = sortQuery[field];

      // this is a deep sort
      if (isPlainObject(order)) {
        transformedSort[field] = convertNestedSortQueryParam(order);
      } else if (typeof order === 'string') {
        validateOrder(order);
        transformedSort[field] = order;
      } else {
        throw Error(`Invalid sort type expected object or string got ${typeof order}`);
      }
    }

    return transformedSort;
  };

  /**
   * Start query parser
   */
  const convertStartQueryParams = (startQuery: unknown): number => {
    const startAsANumber = _.toNumber(startQuery);

    if (!_.isInteger(startAsANumber) || startAsANumber < 0) {
      throw new Error(`convertStartQueryParams expected a positive integer got ${startAsANumber}`);
    }

    return startAsANumber;
  };

  /**
   * Limit query parser
   */
  const convertLimitQueryParams = (limitQuery: unknown): number | undefined => {
    const limitAsANumber = _.toNumber(limitQuery);

    if (!_.isInteger(limitAsANumber) || (limitAsANumber !== -1 && limitAsANumber < 0)) {
      throw new Error(`convertLimitQueryParams expected a positive integer got ${limitAsANumber}`);
    }

    if (limitAsANumber === -1) {
      return undefined;
    }

    return limitAsANumber;
  };

  const convertPageQueryParams = (page: unknown): number => {
    const pageVal = toNumber(page);

    if (!isInteger(pageVal) || pageVal <= 0) {
      throw new PaginationError(
        `Invalid 'page' parameter. Expected an integer > 0, received: ${page}`
      );
    }

    return pageVal;
  };

  const convertPageSizeQueryParams = (pageSize: unknown, page: unknown): number => {
    const pageSizeVal = toNumber(pageSize);

    if (!isInteger(pageSizeVal) || pageSizeVal <= 0) {
      throw new PaginationError(
        `Invalid 'pageSize' parameter. Expected an integer > 0, received: ${page}`
      );
    }

    return pageSizeVal;
  };

  const validatePaginationParams = (
    page: unknown,
    pageSize: unknown,
    start: unknown,
    limit: unknown
  ) => {
    const isPagePagination = !isNil(page) || !isNil(pageSize);
    const isOffsetPagination = !isNil(start) || !isNil(limit);

    if (isPagePagination && isOffsetPagination) {
      throw new PaginationError(
        'Invalid pagination attributes. You cannot use page and offset pagination in the same query'
      );
    }
  };

  class InvalidPopulateError extends Error {
    constructor() {
      super();
      this.message =
        'Invalid populate parameter. Expected a string, an array of strings, a populate object';
    }
  }

  // NOTE: we could support foo.* or foo.bar.* etc later on
  const convertPopulateQueryParams = (
    populate: PopulateParams,
    schema?: Model,
    depth = 0
  ): PopulateQuery => {
    if (depth === 0 && populate === '*') {
      return true;
    }

    if (typeof populate === 'string') {
      return populate.split(',').map((value) => _.trim(value));
    }

    if (Array.isArray(populate)) {
      // map convert
      return _.uniq(
        populate.flatMap((value) => {
          if (typeof value !== 'string') {
            throw new InvalidPopulateError();
          }

          return value.split(',').map((value) => _.trim(value));
        })
      );
    }

    if (_.isPlainObject(populate)) {
      return convertPopulateObject(populate, schema);
    }

    throw new InvalidPopulateError();
  };

  const hasPopulateFragmentDefined = (
    populate: PopulateObjectParams
  ): populate is PopulateObjectParams & Required<Pick<PopulateObjectParams, 'on'>> => {
    return typeof populate === 'object' && 'on' in populate && !isNil(populate.on);
  };

  const hasCountDefined = (
    populate: PopulateObjectParams
  ): populate is PopulateObjectParams & { count: boolean } => {
    return (
      typeof populate === 'object' && 'count' in populate && typeof populate.count === 'boolean'
    );
  };

  const convertPopulateObject = (populate: PopulateAttributesParams, schema?: Model) => {
    if (!schema) {
      return {};
    }

    const { attributes } = schema;
    return Object.entries(populate).reduce((acc, [key, subPopulate]) => {
      // Try converting strings to regular booleans if possible
      if (_.isString(subPopulate)) {
        try {
          const subPopulateAsBoolean = parseType({ type: 'boolean', value: subPopulate });
          // Only true is accepted as a boolean populate value
          return subPopulateAsBoolean === true ? { ...acc, [key]: true } : acc;
        } catch {
          // ignore
        }
      }

      if (_.isBoolean(subPopulate)) {
        // Only true is accepted as a boolean populate value
        return subPopulate === true ? { ...acc, [key]: true } : acc;
      }

      const attribute = attributes[key];

      if (!attribute) {
        return acc;
      }

      // Allow adding an 'on' strategy to populate queries for morphTo relations and dynamic zones
      const isMorphLikeRelationalAttribute =
        isDynamicZoneAttribute(attribute) || isMorphToRelationalAttribute(attribute);

      if (isMorphLikeRelationalAttribute) {
        const hasInvalidProperties = Object.keys(subPopulate).some(
          (key) => !['on', 'count'].includes(key)
        );

        if (hasInvalidProperties) {
          throw new Error(
            `Invalid nested populate for ${schema.info?.singularName}.${key} (${schema.uid}). Expected a fragment ("on") or "count" but found ${JSON.stringify(subPopulate)}`
          );
        }

        const newSubPopulate = {};

        // { on: { ... } }
        if (hasPopulateFragmentDefined(subPopulate)) {
          // transform the fragment and assign it to the new sub-populate object
          Object.assign(newSubPopulate, {
            on: Object.entries(subPopulate.on).reduce(
              (acc, [type, typeSubPopulate]) => ({
                ...acc,
                [type]: convertNestedPopulate(typeSubPopulate, getModel(type)),
              }),
              {}
            ),
          });
        }

        // { count: true | false }
        if (hasCountDefined(subPopulate)) {
          Object.assign(newSubPopulate, { count: subPopulate.count });
        }

        return { ...acc, [key]: newSubPopulate };
      }

      // Edge case when trying to use the fragment ('on') on a non-morph like attribute
      if (!isMorphLikeRelationalAttribute && hasPopulateFragmentDefined(subPopulate)) {
        throw new Error(`Using fragments is not permitted to populate "${key}" in "${schema.uid}"`);
      }

      // NOTE: Retrieve the target schema UID.
      // Only handles basic relations, medias and component since it's not possible
      // to populate with options for a dynamic zone or a polymorphic relation
      let targetSchemaUID;

      if (attribute.type === 'relation') {
        targetSchemaUID = attribute.target;
      } else if (attribute.type === 'component') {
        targetSchemaUID = attribute.component;
      } else if (attribute.type === 'media') {
        targetSchemaUID = 'plugin::upload.file';
      } else {
        return acc;
      }

      const targetSchema = getModel(targetSchemaUID!);

      // ignore the sub-populate for the current key if there is no schema associated
      if (!targetSchema) {
        return acc;
      }

      const populateObject = convertNestedPopulate(subPopulate, targetSchema);

      if (!populateObject) {
        return acc;
      }

      return {
        ...acc,
        [key]: populateObject,
      };
    }, {});
  };

  const convertNestedPopulate = (subPopulate: boolean | PopulateObjectParams, schema?: Model) => {
    if (_.isString(subPopulate)) {
      return parseType({ type: 'boolean', value: subPopulate, forceCast: true });
    }

    if (_.isBoolean(subPopulate)) {
      return subPopulate;
    }

    if (!isPlainObject(subPopulate)) {
      throw new Error(`Invalid nested populate. Expected '*' or an object`);
    }

    const { sort, filters, fields, populate, count, ordering, page, pageSize, start, limit } =
      subPopulate as PopulateObjectParams;

    const query: Query = {};

    if (sort) {
      query.orderBy = convertSortQueryParams(sort);
    }

    if (filters) {
      query.where = convertFiltersQueryParams(filters, schema);
    }

    if (fields) {
      query.select = convertFieldsQueryParams(fields);
    }

    if (populate) {
      query.populate = convertPopulateQueryParams(populate, schema);
    }

    if (count) {
      query.count = convertCountQueryParams(count);
    }

    if (ordering) {
      query.ordering = convertOrderingQueryParams(ordering);
    }

    validatePaginationParams(page, pageSize, start, limit);

    if (!isNil(page)) {
      query.page = convertPageQueryParams(page);
    }

    if (!isNil(pageSize)) {
      query.pageSize = convertPageSizeQueryParams(pageSize, page);
    }

    if (!isNil(start)) {
      query.offset = convertStartQueryParams(start);
    }

    if (!isNil(limit)) {
      query.limit = convertLimitQueryParams(limit);
    }

    return query;
  };

  // TODO: ensure field is valid in content types (will probably have to check strapi.contentTypes since it can be a string.path)
  const convertFieldsQueryParams = (fields: FieldsParams, depth = 0): SelectQuery | undefined => {
    if (depth === 0 && fields === '*') {
      return undefined;
    }

    if (typeof fields === 'string') {
      const fieldsValues = fields.split(',').map((value) => _.trim(value));
      return _.uniq([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE, ...fieldsValues]);
    }

    if (isStringArray(fields)) {
      // map convert
      const fieldsValues = fields
        .flatMap((value) => convertFieldsQueryParams(value, depth + 1))
        .filter((v) => !isNil(v)) as string[];

      return _.uniq([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE, ...fieldsValues]);
    }

    throw new Error('Invalid fields parameter. Expected a string or an array of strings');
  };

  const isValidSchemaAttribute = (key: string, schema?: Model) => {
    if ([DOC_ID_ATTRIBUTE, ID_ATTRIBUTE].includes(key)) {
      return true;
    }

    if (!schema) {
      return false;
    }

    return Object.keys(schema.attributes).includes(key);
  };

  const convertFiltersQueryParams = (filters: FiltersParams, schema?: Model): WhereQuery => {
    // Filters need to be either an array or an object
    // Here we're only checking for 'object' type since typeof [] => object and typeof {} => object
    if (!isObject(filters)) {
      throw new Error('The filters parameter must be an object or an array');
    }

    // Don't mutate the original object
    const filtersCopy = cloneDeep(filters);

    return convertAndSanitizeFilters(filtersCopy, schema);
  };

  const convertAndSanitizeFilters = (filters: FiltersParams, schema?: Model): WhereQuery => {
    if (Array.isArray(filters)) {
      return (
        filters
          // Sanitize each filter
          .map((filter) => convertAndSanitizeFilters(filter, schema))
          // Filter out empty filters
          .filter((filter) => !isPlainObject(filter) || !isEmpty(filter))
      );
    }

    if (!isPlainObject(filters)) {
      return filters as WhereQuery;
    }

    const removeOperator = (operator: string) => delete filters[operator];

    // Here, `key` can either be an operator or an attribute name
    for (const [key, value] of Object.entries(filters)) {
      const attribute = get(key, schema?.attributes);
      const validKey = isOperator(key) || isValidSchemaAttribute(key, schema);

      if (!validKey) {
        removeOperator(key);
      }
      // Handle attributes
      else if (attribute) {
        // Relations
        if (attribute.type === 'relation') {
          filters[key] = convertAndSanitizeFilters(value, getModel(attribute.target!));
        }

        // Components
        else if (attribute.type === 'component') {
          filters[key] = convertAndSanitizeFilters(value, getModel(attribute.component));
        }

        // Media
        else if (attribute.type === 'media') {
          filters[key] = convertAndSanitizeFilters(value, getModel('plugin::upload.file'));
        }

        // Dynamic Zones
        else if (attribute.type === 'dynamiczone') {
          removeOperator(key);
        }

        // Password attributes
        else if (attribute.type === 'password') {
          // Always remove password attributes from filters object
          removeOperator(key);
        }

        // Scalar attributes
        else {
          filters[key] = convertAndSanitizeFilters(value, schema);
        }
      }

      // Handle operators
      else if (['$null', '$notNull'].includes(key)) {
        filters[key] = parseType({ type: 'boolean', value: filters[key], forceCast: true });
      } else if (isObject(value)) {
        filters[key] = convertAndSanitizeFilters(value, schema);
      }

      // Remove empty objects & arrays
      if (isPlainObject(filters[key]) && isEmpty(filters[key])) {
        removeOperator(key);
      }
    }

    return filters;
  };

  const convertStatusParams = (status?: 'draft' | 'published', query: Query = {}) => {
    // NOTE: this is the query layer filters not the document/entity service filters
    query.filters = ({ meta }: { meta: Model }) => {
      const contentType = getModel(meta.uid);

      // Ignore if target model has disabled DP, as it doesn't make sense to filter by its status
      if (!contentType || !hasDraftAndPublish(contentType)) {
        return {};
      }

      return { [PUBLISHED_AT_ATTRIBUTE]: { $null: status === 'draft' } };
    };
  };

  const transformQueryParams = (uid: string, params: Params): Query => {
    // NOTE: can be a CT, a Compo or nothing in the case of polymorphism (DZ & morph relations)
    const schema = getModel(uid);

    const query: Query = {};

    const { _q, sort, filters, fields, populate, page, pageSize, start, limit, status, ...rest } =
      params;

    if (!isNil(status)) {
      convertStatusParams(status, query);
    }

    if (!isNil(_q)) {
      query._q = _q;
    }

    if (!isNil(sort)) {
      query.orderBy = convertSortQueryParams(sort);
    }

    if (!isNil(filters)) {
      query.where = convertFiltersQueryParams(filters, schema);
    }

    if (!isNil(fields)) {
      query.select = convertFieldsQueryParams(fields);
    }

    if (!isNil(populate)) {
      query.populate = convertPopulateQueryParams(populate, schema);
    }

    validatePaginationParams(page, pageSize, start, limit);

    if (!isNil(page)) {
      query.page = convertPageQueryParams(page);
    }

    if (!isNil(pageSize)) {
      query.pageSize = convertPageSizeQueryParams(pageSize, page);
    }

    if (!isNil(start)) {
      query.offset = convertStartQueryParams(start);
    }

    if (!isNil(limit)) {
      query.limit = convertLimitQueryParams(limit);
    }

    return {
      ...rest,
      ...query,
    };
  };

  return {
    private_convertSortQueryParams: convertSortQueryParams,
    private_convertStartQueryParams: convertStartQueryParams,
    private_convertLimitQueryParams: convertLimitQueryParams,
    private_convertPopulateQueryParams: convertPopulateQueryParams,
    private_convertFiltersQueryParams: convertFiltersQueryParams,
    private_convertFieldsQueryParams: convertFieldsQueryParams,
    transformQueryParams,
  };
};

export { createTransformer };
