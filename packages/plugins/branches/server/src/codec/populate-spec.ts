import type { LooseSchema, PopulateMap, PopulateSpec } from './types';

const emptyMap = (): PopulateMap => ({ all: false, entries: new Map() });

const addPath = (map: PopulateMap, path: string) => {
  const [head, ...rest] = path.split('.');
  if (!head) {
    return;
  }
  const existing = map.entries.get(head) ?? {};
  if (rest.length > 0) {
    const nested = Array.isArray(existing.populate)
      ? [...(existing.populate as string[])]
      : existing.populate && typeof existing.populate === 'object'
        ? null
        : [];
    if (nested) {
      nested.push(rest.join('.'));
      existing.populate = nested;
    }
  }
  map.entries.set(head, existing);
};

const specFromObject = (value: Record<string, unknown>): PopulateSpec => {
  const spec: PopulateSpec = {};
  if (typeof value.count === 'boolean') {
    spec.count = value.count;
  }
  const fields = value.fields ?? value.select;
  if (Array.isArray(fields)) {
    spec.fields = fields.map(String);
  } else if (typeof fields === 'string') {
    spec.fields = fields.split(',').map((field) => field.trim());
  }
  if (value.populate !== undefined) {
    spec.populate = value.populate;
  }
  if (value.on && typeof value.on === 'object') {
    spec.on = {};
    for (const [componentUid, fragment] of Object.entries(value.on as Record<string, unknown>)) {
      spec.on[componentUid] =
        fragment && typeof fragment === 'object'
          ? specFromObject(fragment as Record<string, unknown>)
          : {};
    }
  }
  return spec;
};

/**
 * Interprets a `populate` param in every accepted form (`'*'`, `true`, a
 * comma-separated string, an array of dot paths, or an object) as a map of
 * requested attributes. Nested populates stay in their original form so they
 * can be handed back to the document service when hydrating.
 */
export const normalizePopulate = (_schema: LooseSchema, populate: unknown): PopulateMap => {
  const map = emptyMap();

  if (populate === undefined || populate === null || populate === false) {
    return map;
  }
  if (populate === true || populate === '*') {
    map.all = true;
    return map;
  }
  if (typeof populate === 'string') {
    for (const path of populate.split(',')) {
      addPath(map, path.trim());
    }
    return map;
  }
  if (Array.isArray(populate)) {
    for (const path of populate) {
      if (typeof path === 'string') {
        addPath(map, path.trim());
      }
    }
    return map;
  }
  if (typeof populate === 'object') {
    for (const [name, value] of Object.entries(populate as Record<string, unknown>)) {
      if (value === false || value === null || value === undefined) {
        continue;
      }
      if (value === true || value === '*') {
        map.entries.set(name, value === '*' ? { populate: '*' } : {});
      } else if (typeof value === 'object') {
        map.entries.set(name, specFromObject(value as Record<string, unknown>));
      } else if (typeof value === 'string') {
        map.entries.set(name, { populate: value });
      }
    }
  }

  return map;
};

export const isRequested = (map: PopulateMap, name: string): boolean =>
  map.all || map.entries.has(name);

export const getSpec = (map: PopulateMap, name: string): PopulateSpec =>
  map.entries.get(name) ?? {};

/** `fields` param → set of selected scalar names, or `null` when everything is selected. */
export const normalizeFields = (fields: unknown): Set<string> | null => {
  if (fields === undefined || fields === null || fields === '*') {
    return null;
  }
  if (typeof fields === 'string') {
    const list = fields.split(',').map((field) => field.trim());
    return list.includes('*') ? null : new Set(list);
  }
  if (Array.isArray(fields)) {
    const list = fields.map(String);
    return list.includes('*') ? null : new Set(list);
  }
  return null;
};
