import { TRACKED_ATTRIBUTE_TYPES } from '../constants';

export type Attribute = {
  type: string;
  private?: boolean;
  /** Component uid, on `component` attributes */
  component?: string;
  /** Component uids, on `dynamiczone` attributes */
  components?: string[];
};

export type Schema = { attributes: Record<string, Attribute> };

export type GetComponent = (uid: string) => Schema | undefined;

type Values = Record<string, unknown>;

const SYSTEM_FIELDS = new Set([
  'id',
  'documentId',
  'locale',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'firstPublishedAt',
  'createdBy',
  'updatedBy',
  'localizations',
]);

// Components cannot nest deeper than this in the Content-Type Builder
const MAX_DEPTH = 10;

/**
 * Top-level attributes whose provenance is tracked for a content type.
 */
export const getTrackedFields = (contentType: Schema) => {
  return Object.entries(contentType.attributes)
    .filter(([name, attribute]) => {
      return (
        !SYSTEM_FIELDS.has(name) &&
        !name.startsWith('strapi_') &&
        attribute.type !== 'password' &&
        (TRACKED_ATTRIBUTE_TYPES as readonly string[]).includes(attribute.type)
      );
    })
    .map(([name]) => name);
};

/**
 * Content types the plugin follows: user-defined API content types only.
 */
export const isTrackedContentType = (uid: string) => uid.startsWith('api::');

export const isStructured = (attribute: Attribute | undefined) => {
  return attribute?.type === 'component' || attribute?.type === 'dynamiczone';
};

/**
 * A value that holds no content, so nobody wrote it.
 */
export const isEmptyValue = (value: unknown) => {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
};

/**
 * Populate for the nested components of a component, without relations and media: their
 * values are not tracked, and loading them would cost one query each.
 */
const nestedPopulate = (schema: Schema | undefined, getComponent: GetComponent, depth: number) => {
  const populate: Record<string, unknown> = {};

  if (schema === undefined || depth > MAX_DEPTH) {
    return populate;
  }

  Object.entries(schema.attributes).forEach(([name, attribute]) => {
    if (isStructured(attribute)) {
      populate[name] = structuredPopulate(attribute, getComponent, depth + 1);
    }
  });

  return populate;
};

const componentQuery = (uid: string, getComponent: GetComponent, depth: number) => {
  const populate = nestedPopulate(getComponent(uid), getComponent, depth);

  return Object.keys(populate).length > 0 ? { populate } : true;
};

const structuredPopulate = (
  attribute: Attribute,
  getComponent: GetComponent,
  depth: number
): unknown => {
  if (attribute.type === 'dynamiczone') {
    return {
      on: Object.fromEntries(
        (attribute.components ?? []).map((uid) => [uid, componentQuery(uid, getComponent, depth)])
      ),
    };
  }

  return componentQuery(attribute.component ?? '', getComponent, depth);
};

/**
 * Document Service `fields` and `populate` that read the tracked value of `fields`.
 */
export const getReadParams = (schema: Schema, fields: string[], getComponent: GetComponent) => {
  const scalars = fields.filter((field) => !isStructured(schema.attributes[field]));
  const populate: Record<string, unknown> = {};

  fields.forEach((field) => {
    const attribute = schema.attributes[field];

    if (isStructured(attribute)) {
      populate[field] = structuredPopulate(attribute, getComponent, 1);
    }
  });

  return {
    // An empty list would select every column
    fields: scalars.length > 0 ? scalars : ['documentId'],
    populate,
  };
};

const cleanComponent = (
  schema: Schema | undefined,
  value: unknown,
  getComponent: GetComponent
): unknown => {
  if (value === null || typeof value !== 'object') {
    return value ?? null;
  }

  return Object.fromEntries(
    Object.entries(value as Values)
      // Instance ids change when an entry is published or a component is re-created
      .filter(([key]) => key !== 'id')
      .map(([key, nested]) => {
        const attribute = schema?.attributes[key];

        return [
          key,
          isStructured(attribute) ? cleanStructured(attribute!, nested, getComponent) : nested,
        ];
      })
  );
};

const cleanStructured = (
  attribute: Attribute,
  value: unknown,
  getComponent: GetComponent
): unknown => {
  if (attribute.type === 'dynamiczone') {
    return Array.isArray(value)
      ? value.map((item) =>
          cleanComponent(getComponent((item as Values).__component as string), item, getComponent)
        )
      : (value ?? null);
  }

  const schema = getComponent(attribute.component ?? '');

  return Array.isArray(value)
    ? value.map((item) => cleanComponent(schema, item, getComponent))
    : cleanComponent(schema, value, getComponent);
};

/**
 * The tracked values of an entry as hashed: components and dynamic zones lose their
 * instance ids, so a value hashes the same in the draft and the published version.
 */
export const getTrackedValues = (
  schema: Schema,
  entry: Values,
  fields: string[],
  getComponent: GetComponent
): Values => {
  return Object.fromEntries(
    fields
      .filter((field) => field in entry)
      .map((field) => {
        const attribute = schema.attributes[field];

        return [
          field,
          isStructured(attribute)
            ? cleanStructured(attribute, entry[field], getComponent)
            : entry[field],
        ];
      })
  );
};

/**
 * The paths the admin permissions use for a field. Permissions name the fields inside a
 * component (`seo.metaTitle`), never the component itself; a dynamic zone is named as is.
 */
export const getPermissionPaths = (
  schema: Schema,
  field: string,
  getComponent: GetComponent,
  depth = 1
): string[] => {
  const attribute = schema.attributes[field];

  if (attribute?.type !== 'component' || depth > MAX_DEPTH) {
    return [field];
  }

  const component = getComponent(attribute.component ?? '');

  if (component === undefined) {
    return [field];
  }

  return Object.keys(component.attributes).flatMap((name) =>
    getPermissionPaths(component, name, getComponent, depth + 1).map((path) => `${field}.${path}`)
  );
};
