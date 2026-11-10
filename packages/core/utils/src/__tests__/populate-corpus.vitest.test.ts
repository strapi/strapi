/**
 * Pins what the Content API populate validation and sanitization return for a corpus of populate
 * shapes, nested up to 6 levels deep.
 *
 * The snapshot was recorded before the populate traversal stopped walking each nested level
 * twice and stopped deep-copying every node, so any change to it is a change in behaviour.
 *
 * To keep the snapshot readable, a sanitized populate is recorded as what sanitization changed
 * (the paths it removed and the paths it added or changed), plus a hash of the whole output.
 * The hash is sensitive to key order, which matters for `sort` objects.
 *
 * `queryLayer` is a hash of what the query layer builds from the sanitized populate
 * (`transformQueryParams`, as the document service does). It shows whether a difference in the
 * sanitized output can reach the database query.
 */
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isEqual, isPlainObject } from 'lodash';

import { createTransformer } from '../convert-query-params';
import { createAPISanitizers } from '../sanitize';
import { createAPIValidators, validators } from '../validate';
import { corpus, createStrapiGlobal, getModel } from './populate-walk.testdata';

const sanitizers = createAPISanitizers({ getModel });
const apiValidators = createAPIValidators({ getModel });

// What the document service validates `params.populate` with (see `validateParams` in
// packages/core/core/src/services/document-service/repository.ts).
const documentServiceIncludes = {
  sort: ['nonAttributesOperators', 'dynamicZones', 'morphRelations'],
  field: ['scalarAttributes'],
  filters: ['nonAttributesOperators', 'dynamicZones', 'morphRelations'],
};

const { transformQueryParams } = createTransformer({ getModel });

const hash = (value: unknown) =>
  createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);

const auth = { strategy: { name: 'users-permissions' }, credentials: null };

/** Flattens a value into `path -> leaf` pairs. Array indices are written `[i]`. */
const flatten = (value: unknown, path = '', out = new Map<string, unknown>()) => {
  if (Array.isArray(value) && value.length > 0) {
    value.forEach((item, index) => flatten(item, `${path}[${index}]`, out));
  } else if (isPlainObject(value) && Object.keys(value as object).length > 0) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      flatten(item, path ? `${path}.${key}` : key, out);
    }
  } else {
    out.set(path || '(root)', value);
  }

  return out;
};

/** What changed between `before` and `after`, or 'unchanged'. */
const changes = (before: unknown, after: unknown) => {
  if (isEqual(before, after)) {
    return 'unchanged';
  }

  const was = flatten(before);
  const now = flatten(after);

  return {
    removed: [...was.keys()].filter((path) => !now.has(path)),
    set: Object.fromEntries(
      [...now.entries()].filter(([path, value]) => !was.has(path) || !isEqual(was.get(path), value))
    ),
    sha1: hash(after),
  };
};

const queryLayer = (uid: string, populate: unknown) => {
  try {
    return hash(transformQueryParams(uid, { populate }));
  } catch (error) {
    return `throws ${(error as Error).message}`;
  }
};

const outcome = async (fn: () => Promise<unknown>, input: unknown) => {
  try {
    const result = await fn();

    return result === undefined ? 'passes' : { passes: changes(input, result) };
  } catch (error) {
    const { name, message, details } = error as {
      name: string;
      message: string;
      details?: unknown;
    };

    return { throws: `${name}: ${message}`, details };
  }
};

describe('populate validation and sanitization corpus', () => {
  const originalStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = createStrapiGlobal();
  });

  afterEach(() => {
    global.strapi = originalStrapi;
  });

  it.each(corpus().map((entry) => [entry.name, entry] as const))('%s', async (_name, entry) => {
    const schema = getModel(entry.uid);
    const { populate } = entry;

    const sanitized = await sanitizers.populate(populate, schema, { auth: { ...auth } });
    const sanitizedWithoutAuth = await sanitizers.populate(populate, schema);

    expect({
      validate: await outcome(() => apiValidators.populate(populate, schema), populate),
      documentServiceValidate: await outcome(
        () => validators.validatePopulate({ schema, getModel }, populate, documentServiceIncludes),
        populate
      ),
      sanitized: changes(populate, sanitized),
      sanitizedWithoutAuth: isEqual(sanitizedWithoutAuth, sanitized)
        ? 'same as with auth'
        : changes(populate, sanitizedWithoutAuth),
      queryLayer: queryLayer(entry.uid, sanitized),
    }).toMatchSnapshot();
  });
});
