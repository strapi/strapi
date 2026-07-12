import { z } from '@strapi/utils';
import type { Schema, Struct } from '@strapi/types';
import { getScalarAttributeKeys } from './sort-schema';

/**
 * Maps a scalar Strapi attribute type to the appropriate Zod leaf value schema
 * used inside filter operator objects (e.g. { $eq: <value> }).
 */
export const attributeTypeToFilterValue = (attr: Schema.Attribute.AnyAttribute): z.ZodTypeAny => {
  switch (attr.type) {
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      return z.union([z.number(), z.array(z.number())]);
    case 'boolean':
      return z.boolean();
    case 'enumeration': {
      const enumAttr = attr as Schema.Attribute.Enumeration<string[]>;
      if (Array.isArray(enumAttr.enum) && enumAttr.enum.length > 0) {
        return z.union([
          z.enum(enumAttr.enum as [string, ...string[]]),
          z.array(z.enum(enumAttr.enum as [string, ...string[]])),
        ]);
      }
      return z.union([z.string(), z.array(z.string())]);
    }
    default:
      // string, text, richtext, email, password, uid, date, datetime, time, timestamp
      return z.union([z.string(), z.array(z.string()), z.null()]);
  }
};

/** All supported Strapi filter operators (excludes the experimental `$jsonSupersetOf`). */
export const FILTER_OPERATORS = [
  '$eq',
  '$eqi',
  '$ne',
  '$nei',
  '$in',
  '$notIn',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$between',
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
  '$startsWith',
  '$startsWithi',
  '$endsWith',
  '$endsWithi',
  '$null',
  '$notNull',
] as const;

/** Minimal model shape needed to resolve nested filter targets (relations, components). */
type GetModel = (uid: string) => { attributes?: Struct.SchemaAttributes } | undefined;

/** Builds the per-field schema: a direct value (implicit $eq) or an operator object. */
const buildScalarFieldFilter = (attr: Schema.Attribute.AnyAttribute): z.ZodTypeAny => {
  const valueSchema = attributeTypeToFilterValue(attr);
  const operatorObject = z.object(
    Object.fromEntries(FILTER_OPERATORS.map((op) => [op, valueSchema.optional()]))
  );
  return z.union([valueSchema, operatorObject]);
};

/**
 * Recursively builds a filter object for a nested target's scalar attributes.
 * Descends into component attributes (bounded by `visited` to break circular components)
 * and one level into relation attributes so callers can filter on related-entry fields
 * (e.g. `{ author: { name: { $contains: "a" } } }`). Deeper relation-of-relation nesting
 * is intentionally not expanded to keep the schema bounded; the permission layer still
 * sanitizes any filter path the caller supplies.
 */
const buildNestedTargetFilter = (
  attributes: Struct.SchemaAttributes,
  getModel: GetModel,
  visited: Set<string>,
  allowRelations: boolean
): z.ZodTypeAny | undefined => {
  const fieldShapes: Record<string, z.ZodTypeAny> = {};

  for (const [key, attr] of Object.entries(attributes)) {
    if ((attr as { private?: boolean }).private === true || key === 'id') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (getScalarAttributeKeys({ [key]: attr } as Struct.SchemaAttributes).length === 1) {
      fieldShapes[key] = buildScalarFieldFilter(attr).optional();
      // eslint-disable-next-line no-continue
      continue;
    }

    if (attr.type === 'component' && (attr as { component?: string }).component !== undefined) {
      const componentUid = (attr as { component: string }).component;
      if (visited.has(componentUid) === true) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const component = getModel(componentUid);
      if (component?.attributes !== undefined) {
        const nested = buildNestedTargetFilter(
          component.attributes,
          getModel,
          new Set([...visited, componentUid]),
          allowRelations
        );
        if (nested !== undefined) {
          fieldShapes[key] = nested.optional();
        }
      }
      // eslint-disable-next-line no-continue
      continue;
    }

    if (
      allowRelations === true &&
      attr.type === 'relation' &&
      (attr as { target?: string }).target !== undefined &&
      (attr as { target?: string }).target !== 'admin::user'
    ) {
      const targetUid = (attr as { target: string }).target;
      const target = getModel(targetUid);
      if (target?.attributes !== undefined) {
        // Only descend one relation level: pass allowRelations=false to prevent
        // relation-of-relation blow-up while still expanding the target's components.
        const nested = buildNestedTargetFilter(target.attributes, getModel, visited, false);
        if (nested !== undefined) {
          fieldShapes[key] = nested.optional();
        }
      }
    }
  }

  if (Object.keys(fieldShapes).length === 0) {
    return undefined;
  }

  return z.object(fieldShapes).strict();
};

/**
 * Builds a per-content-type recursive filters Zod schema.
 *
 * Shape:
 *   - Logical operators: $and, $or accept an array of filter objects.
 *   - Logical operator: $not accepts a single filter object.
 *   - Scalar field keys: accept either a direct value (implicit $eq) or an operator
 *     object { $eq, $contains, $gt, … }.
 *   - When `getModel` is provided, relation and component field keys accept a nested
 *     filter object targeting the related/embedded entry's scalar fields (one relation
 *     level deep). Without `getModel`, only top-level scalar fields are filterable.
 *
 * If the model has no filterable fields, the schema is z.never() (filters not allowed).
 */
export const buildFiltersSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null,
  getModel?: GetModel
): z.ZodTypeAny => {
  const scalarKeys = getScalarAttributeKeys(attributes, permittedFields);

  // Nested (relation/component) filter shapes are only built when a model resolver is
  // supplied. Absent that, behavior is identical to the original top-level-scalar schema.
  const nestedShapes: Record<string, z.ZodTypeAny> = {};
  if (getModel !== undefined) {
    for (const [key, attr] of Object.entries(attributes)) {
      if ((attr as { private?: boolean }).private === true) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (
        permittedFields !== null &&
        permittedFields !== undefined &&
        permittedFields.has(key) === false
      ) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (attr.type === 'component' && (attr as { component?: string }).component !== undefined) {
        const component = getModel((attr as { component: string }).component);
        if (component?.attributes !== undefined) {
          const nested = buildNestedTargetFilter(
            component.attributes,
            getModel,
            new Set([(attr as { component: string }).component]),
            true
          );
          if (nested !== undefined) nestedShapes[key] = nested.optional();
        }
      } else if (
        attr.type === 'relation' &&
        (attr as { target?: string }).target !== undefined &&
        (attr as { target?: string }).target !== 'admin::user'
      ) {
        const target = getModel((attr as { target: string }).target);
        if (target?.attributes !== undefined) {
          const nested = buildNestedTargetFilter(target.attributes, getModel, new Set(), false);
          if (nested !== undefined) nestedShapes[key] = nested.optional();
        }
      }
    }
  }

  const nestedKeys = Object.keys(nestedShapes);

  if (scalarKeys.length === 0 && nestedKeys.length === 0) {
    return z.never();
  }

  // Lazy reference for recursion ($and / $or / $not)
  const filtersSchema: z.ZodTypeAny = z.lazy(() => {
    const fieldShapes: Record<string, z.ZodTypeAny> = { ...nestedShapes };

    for (const key of scalarKeys) {
      fieldShapes[key] = buildScalarFieldFilter(attributes[key]).optional();
    }

    return z
      .object({
        $and: z.array(filtersSchema).optional(),
        $or: z.array(filtersSchema).optional(),
        $not: filtersSchema.optional(),
        ...fieldShapes,
      })
      .strict();
  });

  const fieldList = [...scalarKeys, ...nestedKeys].join(', ');
  const nestedNote =
    nestedKeys.length > 0
      ? ' Relation/component fields accept nested filter objects (one relation level deep).'
      : '';

  return filtersSchema
    .optional()
    .describe(
      `Filter object. Supports logical operators ($and, $or, $not) and field operators ` +
        `($eq, $ne, $in, $contains, $gt, $lt, etc.).${nestedNote} Valid fields: ${fieldList}.`
    );
};
