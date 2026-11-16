import { isEmpty, isObject, isPlainObject } from 'lodash';

import { pipe as pipeAsync } from '../async';
import {
  isScalarAttribute,
  constants,
  isComponentAttribute,
  isDynamicZoneAttribute,
  isMediaAttribute,
  isMorphToRelationalAttribute,
  isRelationalAttribute,
} from '../content-types';
import {
  traverseQueryFilters,
  traverseQuerySort,
  traverseQueryFields,
  traverseQueryPopulate,
} from '../traverse';
import { throwPassword, throwPrivate, throwDynamicZones, throwMorphToRelations } from './visitors';
import { isOperator } from '../operators';
import { asyncCurry, throwInvalidKey } from './utils';
import { ValidationError } from '../errors';
import type { Attribute, Model } from '../types';
import { isBooleanLike } from '../parse-type';
import type { SHARED_QUERY_PARAM_KEYS } from '../content-api-constants';
import type { Parent, Path } from '../traverse/factory';

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

interface Context {
  schema: Model;
  getModel: (model: string) => Model;
}

interface PopulateContext extends Context {
  path?: Path;
  parent?: Parent;
}

type AnyFunc = (...args: any[]) => any;

export const FILTER_TRAVERSALS = [
  'nonAttributesOperators',
  'dynamicZones',
  'morphRelations',
  'passwords',
  'private',
];

const isPlainRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

/**
 * Operators whose operand is left to query conversion, which reads it as a boolean and rejects
 * any other value, an object included, with a 400.
 */
const BOOLEAN_CAST_OPERATORS = new Set(['$null', '$notNull']);

/**
 * Operators whose object operand is a map of operators, searched in turn.
 */
const LOGICAL_OPERATORS = new Set(['$not', '$and', '$or']);

/**
 * True when every key of the object is a non-negative integer. The query string parser (`qs`) turns
 * a list longer than its `arrayLimit` into such an object, keyed by index.
 */
const hasOnlyIndexKeys = (value: Record<string, unknown>) =>
  Object.keys(value).every((key) => /^\d+$/.test(key));

const arrayLimitMessage = (operator: string, path: string) =>
  `Invalid operand for ${operator} at ${path}: the list has more items than the query parser's arrayLimit. Send fewer items, or raise arrayLimit in the strapi::query middleware config`;

/**
 * Operators whose operand is a list of filters.
 */
const GROUP_OPERATORS = new Set(['$and', '$or']);

/**
 * True when the value holds a condition: anything but a plain object that holds only empty objects,
 * at any depth. Such an object holds no condition: sanitization and query conversion remove it.
 */
const holdsCondition = (value: unknown): boolean =>
  isPlainRecord(value) === false || Object.values(value).some(holdsCondition);

/**
 * True when a `$and` / `$or` operand is a plain object that holds a condition, whatever its keys:
 * indexes, attribute names or operators. The database layer reads a group only from a list and has
 * no attribute level `$and` / `$or`, so it rejects such an operand, and query conversion drops one
 * with no valid key left, so letting one through can make the query match every row.
 */
const isObjectGroupOperand = (
  operator: string,
  operand: unknown
): operand is Record<string, unknown> =>
  GROUP_OPERATORS.has(operator) === true &&
  isPlainRecord(operand) === true &&
  holdsCondition(operand) === true;

/**
 * True when a raw filter path, e.g. `title.$null.$or`, goes through the operand of an operator that
 * is not logical. Such an operand is a value, not a filter: query conversion casts a `$null` /
 * `$notNull` operand to a boolean, so a `$and` / `$or` key in it does not filter anything.
 */
const isInOperatorOperand = (rawPath: string | null) => {
  if (rawPath === null) {
    return false;
  }

  // Drop the last segment (the key itself) and the list indexes, e.g. `$and[0]` -> `$and`
  const parentKeys = rawPath
    .split('.')
    .slice(0, -1)
    .map((segment) => segment.replace(/(\[\d+\])+$/, ''));

  return parentKeys.some((key) => isOperator(key) === true && LOGICAL_OPERATORS.has(key) === false);
};

/**
 * Returns the first non-empty plain object in the operand of a non-logical operator: the operand
 * itself, or an item of its value list at any depth. An operator map is such an object too.
 */
const findObjectValue = (operand: unknown): Record<string, unknown> | undefined => {
  if (Array.isArray(operand) === true) {
    for (const item of operand as unknown[]) {
      const found = findObjectValue(item);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (isPlainRecord(operand) === true && Object.keys(operand).length > 0) {
    return operand;
  }

  return undefined;
};

/**
 * Returns the first non-logical operator, and its operand, in an operator map (or a list of them, at
 * any depth) whose operand is a non-empty plain object, operator maps included, or holds one in its
 * value list, e.g. `{ $eq: { a: 1 } }` or `{ $notIn: [{ $eq: 'x' }] }`.
 * The operand of a logical operator is an operator map, or a list of them, and is searched in turn.
 * The filters traversal does not walk such operands, and query conversion drops them along with their
 * condition, or empties the list holding them. The query then matches every row, except for a `$and` /
 * `$or` list on a scalar attribute, which the database layer rejects with a 500.
 * Empty objects are not reported: they hold no condition, and sanitization removes them.
 */
const findObjectOperand = (
  filter: unknown
): { operator: string; operand: Record<string, unknown> } | undefined => {
  if (Array.isArray(filter) === true) {
    for (const item of filter as unknown[]) {
      const nested = findObjectOperand(item);

      if (nested !== undefined) {
        return nested;
      }
    }

    return undefined;
  }

  if (isPlainRecord(filter) === false) {
    return undefined;
  }

  for (const [operator, operand] of Object.entries(filter)) {
    if (isOperator(operator) === false || BOOLEAN_CAST_OPERATORS.has(operator) === true) {
      continue;
    }

    if (LOGICAL_OPERATORS.has(operator) === true) {
      const nested = findObjectOperand(operand);

      if (nested !== undefined) {
        return nested;
      }

      continue;
    }

    const objectValue = findObjectValue(operand);

    if (objectValue !== undefined) {
      return { operator, operand: objectValue };
    }
  }

  return undefined;
};

/**
 * True for the attributes whose filter can hold operators: scalar, relation, media and component
 * attributes. Dynamic zones and morphTo relations are left to their own checks, which reject them.
 */
const isOperatorFilterableAttribute = (attribute: Attribute | undefined) =>
  isScalarAttribute(attribute) === true ||
  isMediaAttribute(attribute) === true ||
  (isRelationalAttribute(attribute) === true &&
    isMorphToRelationalAttribute(attribute) === false) ||
  (isComponentAttribute(attribute) === true && isDynamicZoneAttribute(attribute) === false);

export const validateFilters = asyncCurry(
  async (ctx: Context, filters: unknown, include: (typeof FILTER_TRAVERSALS)[number][]) => {
    // TODO: schema checks should check that it is a valid schema with yup
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateFilters');
    }

    // Build the list of functions conditionally
    const functionsToApply: Array<AnyFunc> = [];

    // keys that are not attributes or valid operators
    if (include.includes('nonAttributesOperators')) {
      functionsToApply.push(
        traverseQueryFilters(({ key, attribute, path, value, parent }) => {
          const isIdKey = [ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key);
          // An operator at the root of the filters, e.g. `{ $not: { $eq: ... } }`, applies to no
          // attribute, so the attribute checks below never see its operand
          const isRootOperator = parent === undefined && isOperator(key) === true;

          let filter: unknown;
          if (isIdKey || isOperatorFilterableAttribute(attribute) === true) {
            filter = isPlainRecord(value) === true ? value : undefined;
          } else if (isRootOperator === true) {
            filter = { [key]: value };
          }

          if (filter !== undefined) {
            const objectOperand = findObjectOperand(filter);

            if (objectOperand !== undefined) {
              const { operator, operand } = objectOperand;
              // id and documentId are not schema attributes, so the attribute path stops at their parent
              let operandPath = path.attribute ?? key;
              if (attribute === undefined && path.attribute !== null) {
                operandPath = `${path.attribute}.${key}`;
              }

              // A REST list longer than the `strapi::query` middleware's `arrayLimit` reaches us as an
              // object keyed by index, so name the limit instead of the object
              if (hasOnlyIndexKeys(operand) === true) {
                throw new ValidationError(arrayLimitMessage(operator, operandPath), {
                  key: operator,
                  path: operandPath,
                });
              }

              throw new ValidationError(
                `Invalid operand for ${operator} at ${operandPath}: expected a value, not an object`,
                { key: operator, path: operandPath }
              );
            }
          }

          if (
            isObjectGroupOperand(key, value) === true &&
            isInOperatorOperand(path.raw) === false
          ) {
            // $and and $or have no attribute path, so name the raw path, e.g. `category.$or`
            const operandPath = path.raw ?? key;

            // A REST list longer than the `strapi::query` middleware's `arrayLimit`, or with an index
            // of `arrayLimit` or more, reaches us as an object keyed by index
            if (hasOnlyIndexKeys(value) === true) {
              throw new ValidationError(arrayLimitMessage(key, operandPath), {
                key,
                path: operandPath,
              });
            }

            // Only name the places where the database layer reads a list of filters: under a scalar
            // attribute, the list form is not supported either
            throw new ValidationError(
              `Invalid operand for ${key} at ${operandPath}: expected a list of filters, at the root of the filters or under a relation, not an object`,
              { key, path: operandPath }
            );
          }

          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if (isIdKey) {
            return;
          }

          const isAttribute = !!attribute;

          if (!isAttribute && !isOperator(key)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    if (include.includes('dynamicZones')) {
      functionsToApply.push(traverseQueryFilters(throwDynamicZones, ctx));
    }

    if (include.includes('morphRelations')) {
      functionsToApply.push(traverseQueryFilters(throwMorphToRelations, ctx));
    }

    if (include.includes('passwords')) {
      functionsToApply.push(traverseQueryFilters(throwPassword, ctx));
    }

    if (include.includes('private')) {
      functionsToApply.push(traverseQueryFilters(throwPrivate, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return filters;
    }

    return pipeAsync(...functionsToApply)(filters);
  }
);

export const defaultValidateFilters = asyncCurry(async (ctx: Context, filters: unknown) => {
  return validateFilters(ctx, filters, FILTER_TRAVERSALS);
});

export const SORT_TRAVERSALS = [
  'nonAttributesOperators',
  'dynamicZones',
  'morphRelations',
  'passwords',
  'private',
  'nonScalarEmptyKeys',
];

export const validateSort = asyncCurry(
  async (ctx: Context, sort: unknown, include: (typeof SORT_TRAVERSALS)[number][]) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateSort');
    }

    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Validate non attribute keys
    if (include.includes('nonAttributesOperators')) {
      functionsToApply.push(
        traverseQuerySort(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          // status is a virtual sort key for D&P-enabled content types
          if (key === 'status' && ctx.schema?.options?.draftAndPublish) {
            return;
          }

          if (!attribute) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Validate dynamic zones from sort
    if (include.includes('dynamicZones')) {
      functionsToApply.push(traverseQuerySort(throwDynamicZones, ctx));
    }

    // Validate morphTo relations from sort
    if (include.includes('morphRelations')) {
      functionsToApply.push(traverseQuerySort(throwMorphToRelations, ctx));
    }

    // Validate passwords from sort
    if (include.includes('passwords')) {
      functionsToApply.push(traverseQuerySort(throwPassword, ctx));
    }

    // Validate private from sort
    if (include.includes('private')) {
      functionsToApply.push(traverseQuerySort(throwPrivate, ctx));
    }

    // Validate non-scalar empty keys
    if (include.includes('nonScalarEmptyKeys')) {
      functionsToApply.push(
        traverseQuerySort(({ key, attribute, value, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not removing it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (!isScalarAttribute(attribute) && isEmpty(value)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return sort;
    }

    return pipeAsync(...functionsToApply)(sort);
  }
);

export const defaultValidateSort = asyncCurry(async (ctx: Context, sort: unknown) => {
  return validateSort(ctx, sort, SORT_TRAVERSALS);
});

export const FIELDS_TRAVERSALS = ['scalarAttributes', 'privateFields', 'passwordFields'];

export const validateFields = asyncCurry(
  async (ctx: Context, fields: unknown, include: (typeof FIELDS_TRAVERSALS)[number][]) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidateFields');
    }
    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Only allow scalar attributes
    if (include.includes('scalarAttributes')) {
      functionsToApply.push(
        traverseQueryFields(({ key, attribute, path }) => {
          // ID is not an attribute per se, so we need to make
          // an extra check to ensure we're not throwing because of it
          if ([ID_ATTRIBUTE, DOC_ID_ATTRIBUTE].includes(key)) {
            return;
          }

          if (attribute == null || !isScalarAttribute(attribute)) {
            throwInvalidKey({ key, path: path.attribute });
          }
        }, ctx)
      );
    }

    // Private fields
    if (include.includes('privateFields')) {
      functionsToApply.push(traverseQueryFields(throwPrivate, ctx));
    }

    // Password fields
    if (include.includes('passwordFields')) {
      functionsToApply.push(traverseQueryFields(throwPassword, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return fields;
    }

    return pipeAsync(...functionsToApply)(fields);
  }
);

export const defaultValidateFields = asyncCurry(async (ctx: Context, fields: unknown) => {
  return validateFields(ctx, fields, FIELDS_TRAVERSALS);
});

const isMorphLikeAttribute = (attribute?: Attribute) =>
  isDynamicZoneAttribute(attribute) || isMorphToRelationalAttribute(attribute);

const isPopulatableAttribute = (attribute?: Attribute) =>
  !!attribute && ['relation', 'dynamiczone', 'component', 'media'].includes(attribute.type);

const isDotNotationPopulate = (populate: unknown): populate is string | string[] => {
  if (populate === '*') {
    return false;
  }

  if (typeof populate === 'string') {
    return true;
  }

  return (
    Array.isArray(populate) && populate.length > 0 && populate.every((p) => typeof p === 'string')
  );
};

const flattenDotPopulatePaths = (populate: string | string[]) => {
  const items = Array.isArray(populate) ? populate : [populate];

  return items.flatMap((item) =>
    item
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean)
  );
};

const validatePopulateDotPathSegments = (
  { schema, getModel }: { schema: Model; getModel: (uid: string) => Model },
  segments: string[],
  pathPrefix: string
) => {
  if (!segments.length) {
    return;
  }

  const [head, ...tail] = segments;
  const fullPath = pathPrefix ? `${pathPrefix}.${head}` : head;
  const attribute = schema.attributes[head];

  if (!attribute || !isPopulatableAttribute(attribute)) {
    throwInvalidKey({ key: head, path: fullPath });
  }

  if (!tail.length) {
    return;
  }

  if (attribute.type === 'component') {
    if (!attribute.component) {
      throwInvalidKey({ key: head, path: fullPath });
    }

    validatePopulateDotPathSegments(
      { schema: getModel(attribute.component), getModel },
      tail,
      fullPath
    );
    return;
  }

  if (attribute.type === 'relation') {
    if (isMorphLikeAttribute(attribute)) {
      throwInvalidKey({ key: head, path: fullPath });
    }

    if (!attribute.target) {
      throwInvalidKey({ key: head, path: fullPath });
    }

    validatePopulateDotPathSegments(
      { schema: getModel(attribute.target!), getModel },
      tail,
      fullPath
    );
    return;
  }

  if (attribute.type === 'media') {
    throwInvalidKey({ key: head, path: fullPath });
  }

  if (attribute.type === 'dynamiczone') {
    const [nextSegment, ...rest] = tail;
    const nextPath = `${fullPath}.${nextSegment}`;
    const candidates = (attribute.components ?? [])
      .map((uid) => getModel(uid))
      .filter((model) => model?.attributes?.[nextSegment]);

    if (!candidates.length) {
      throwInvalidKey({ key: nextSegment, path: nextPath });
    }

    let validated = false;

    for (const componentSchema of candidates) {
      const nestedAttribute = componentSchema.attributes[nextSegment];

      try {
        if (!rest.length) {
          if (nestedAttribute) {
            validated = true;
            break;
          }
        } else if (nestedAttribute?.type === 'component' && nestedAttribute.component) {
          validatePopulateDotPathSegments(
            { schema: getModel(nestedAttribute.component), getModel },
            rest,
            nextPath
          );
          validated = true;
          break;
        } else if (
          nestedAttribute?.type === 'relation' &&
          !isMorphLikeAttribute(nestedAttribute) &&
          nestedAttribute.target
        ) {
          validatePopulateDotPathSegments(
            { schema: getModel(nestedAttribute.target), getModel },
            rest,
            nextPath
          );
          validated = true;
          break;
        }
      } catch {
        // Try the next dynamic-zone component type.
      }
    }

    if (!validated) {
      throwInvalidKey({ key: nextSegment, path: nextPath });
    }
  }
};

const validatePopulateDotPaths = (
  ctx: { schema: Model; getModel: (uid: string) => Model },
  populate: string | string[]
) => {
  for (const path of flattenDotPopulatePaths(populate)) {
    const segments = path
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    validatePopulateDotPathSegments(ctx, segments, '');
  }
};

const validateMorphLikeNestedPopulate = (
  populateValue: unknown,
  { path }: { path: string | null }
) => {
  // Keep in sync with convert-query-params polymorphic nested populate handling.
  if (populateValue != null && populateValue !== '*') {
    throwInvalidKey({ key: 'populate', path });
  }
};

export const POPULATE_TRAVERSALS = ['nonAttributesOperators', 'private'];

// Query params that only apply at the root of a query. They are inherited by populated
// relations, so they are rejected inside `populate` with an explanation (see #21911).
const ROOT_ONLY_QUERY_PARAMS: ReadonlyArray<(typeof SHARED_QUERY_PARAM_KEYS)[number]> = [
  'status',
  'publicationFilter',
  'hasPublishedVersion',
];

export const validatePopulate = asyncCurry(
  async (
    ctx: PopulateContext,
    populate: unknown,
    includes: {
      fields?: (typeof FIELDS_TRAVERSALS)[number][];
      sort?: (typeof SORT_TRAVERSALS)[number][];
      filters?: (typeof FILTER_TRAVERSALS)[number][];
      populate?: (typeof POPULATE_TRAVERSALS)[number][];
    }
  ) => {
    if (!ctx.schema) {
      throw new Error('Missing schema in defaultValidatePopulate');
    }

    if (isDotNotationPopulate(populate)) {
      validatePopulateDotPaths({ schema: ctx.schema, getModel: ctx.getModel }, populate);

      if (includes?.populate?.includes('private')) {
        return traverseQueryPopulate(throwPrivate, ctx)(populate);
      }

      return populate;
    }

    // Build the list of functions conditionally based on the include array
    const functionsToApply: Array<AnyFunc> = [];

    // Always include the main traversal function
    functionsToApply.push(
      traverseQueryPopulate(
        async ({ key, path, value, schema, attribute, getModel, parent }, { set }) => {
          /**
           * NOTE: The parent check is done to support "filters" (and the rest of keys) as valid attribute names.
           *
           * The parent will not be an attribute when its a "populate" / "filters" / "sort" ... key.
           * Only in those scenarios the node will be an attribute.
           */
          if (!parent?.attribute && attribute) {
            const isPopulatableAttribute = [
              'relation',
              'dynamiczone',
              'component',
              'media',
            ].includes(attribute.type);

            if (isMorphLikeAttribute(attribute) && isObject(value) && 'populate' in value) {
              validateMorphLikeNestedPopulate((value as Record<string, unknown>).populate, {
                path: path.raw,
              });
            }

            // Throw on non-populate attributes
            if (!isPopulatableAttribute) {
              throwInvalidKey({ key, path: path.raw });
            }

            // Valid populatable attribute, so return
            return;
          }

          // If we're looking at a populate fragment, ensure its target is valid
          if (key === 'on') {
            // Populate fragment should always be an object
            if (!isObject(value)) {
              return throwInvalidKey({ key, path: path.raw });
            }

            const targets = Object.keys(value);

            for (const target of targets) {
              const model = getModel(target);

              // If a target is invalid (no matching model), then raise an error
              if (!model) {
                throwInvalidKey({ key: target, path: `${path.raw}.${target}` });
              }
            }

            // If the fragment's target is fine, then let it pass
            return;
          }

          // Ignore plain wildcards
          if (key === '' && value === '*') {
            return;
          }

          // Ensure count is a boolean
          if (key === 'count') {
            if (isBooleanLike(value)) {
              return;
            }

            throwInvalidKey({ key, path: path.attribute });
          }

          // Allowed boolean-like keywords should be ignored.
          //
          // Asked as a predicate rather than by catching `parseType`'s error: this runs
          // once per populate key, and almost no key is boolean-like, so the previous
          // try/catch built and threw away an Error — including a stack capture — on
          // essentially every key of every populate tree of every request.
          if (isBooleanLike(key)) {
            return;
          }

          // Handle nested `sort` validation with custom or default traversals
          if (key === 'sort') {
            set(
              key,
              await validateSort(
                {
                  schema,
                  getModel,
                },
                value, // pass the sort value
                includes?.sort || SORT_TRAVERSALS
              )
            );
            return;
          }

          // Handle nested `filters` validation with custom or default traversals
          if (key === 'filters') {
            set(
              key,
              await validateFilters(
                {
                  schema,
                  getModel,
                },
                value, // pass the filters value
                includes?.filters || FILTER_TRAVERSALS
              )
            );
            return;
          }

          // Handle nested `fields` validation with custom or default traversals
          if (key === 'fields') {
            set(
              key,
              await validateFields(
                {
                  schema,
                  getModel,
                },
                value, // pass the fields value
                includes?.fields || FIELDS_TRAVERSALS
              )
            );
            return;
          }

          // Nested `populate`. The populate traversal walks into it with this same visitor
          // (the `isPopulateKeyword` handler in traverse/query-populate.ts), and the private
          // attribute pass below walks into it the same way. Validating it here as well walked
          // every nested level twice, so the work doubled with each level of nesting. The
          // traversal does this even when the schema has an attribute named `populate`.
          if (key === 'populate') {
            // The traversal turns a dot-notation string into an object before it walks it, so
            // the path checks `validatePopulate` runs on a string have to run here.
            if (isDotNotationPopulate(value)) {
              validatePopulateDotPaths({ schema, getModel }, value);
            }

            return;
          }

          // Throw an error if non-attribute operators are included in the populate array
          if (includes?.populate?.includes('nonAttributesOperators')) {
            throwInvalidKey({
              key,
              path: path.attribute,
              reason: ROOT_ONLY_QUERY_PARAMS.some((param) => param === key)
                ? `${key} is only accepted at the root of the query, and it also applies to populated relations`
                : undefined,
            });
          }
        },
        ctx
      )
    );

    // Conditionally traverse for private fields only if 'private' is included
    if (includes?.populate?.includes('private')) {
      functionsToApply.push(traverseQueryPopulate(throwPrivate, ctx));
    }

    // Return directly if no validation functions are provided
    if (functionsToApply.length === 0) {
      return populate;
    }

    return pipeAsync(...functionsToApply)(populate);
  }
);

export const defaultValidatePopulate = asyncCurry(async (ctx: Context, populate: unknown) => {
  if (!ctx.schema) {
    throw new Error('Missing schema in defaultValidatePopulate');
  }

  // Call validatePopulate and include all validations by passing in full traversal arrays
  return validatePopulate(ctx, populate, {
    filters: FILTER_TRAVERSALS,
    sort: SORT_TRAVERSALS,
    fields: FIELDS_TRAVERSALS,
    populate: POPULATE_TRAVERSALS,
  });
});
