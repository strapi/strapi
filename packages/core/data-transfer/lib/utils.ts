import type { Readable } from 'stream';
import type { Context, Diff } from '../types';

import { isArray, isObject, zip, isEqual, uniq, mapValues, pick } from 'lodash/fp';

/**
 * Collect every entity in a Readable stream
 */
export const collect = <T = unknown>(stream: Readable): Promise<T[]> => {
  const chunks: T[] = [];

  return new Promise((resolve) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      stream.destroy();
      resolve(chunks);
    });
  });
};

const createContext = (): Context => ({ path: [] });

export const jsonDiffs = (a: unknown, b: unknown, ctx: Context = createContext()): Diff[] => {
  const diffs: Diff[] = [];
  const { path } = ctx;

  // Define helpers

  const added = () => {
    diffs.push({ kind: 'added', path, type: bType, value: b });
    return diffs;
  };

  const deleted = () => {
    diffs.push({ kind: 'deleted', path, type: aType, value: a });
    return diffs;
  };

  const modified = () => {
    diffs.push({
      kind: 'modified',
      path,
      types: [aType, bType],
      values: [a, b],
    });
    return diffs;
  };

  const aType = typeof a;
  const bType = typeof b;

  if (aType === 'undefined') {
    return added();
  }

  if (bType === 'undefined') {
    return deleted();
  }

  if (isArray(a) && isArray(b)) {
    let k = 0;

    for (const [aItem, bItem] of zip(a, b)) {
      const kCtx: Context = { path: [...path, k.toString()] };
      const kDiffs = jsonDiffs(aItem, bItem, kCtx);

      diffs.push(...kDiffs);

      k++;
    }

    return diffs;
  }

  if (isObject(a) && isObject(b)) {
    const keys = uniq(Object.keys(a).concat(Object.keys(b)));

    for (const key of keys) {
      const aValue = (a as any)[key];
      const bValue = (b as any)[key];

      const nestedDiffs = jsonDiffs(aValue, bValue, { path: [...path, key] });

      diffs.push(...nestedDiffs);
    }

    return diffs;
  }

  if (!isEqual(a, b)) {
    modified();
  }

  return diffs;
};

const selectedKeys = [
  'collectionName',
  'info',
  'options',
  'pluginOptions',
  'attributes',
  'kind',
  'modelType',
  'modelName',
  'uid',
  'plugin',
  'globalId',
];

export const mapSchemasValues = (schemas: any) => mapValues(pick(selectedKeys), schemas);
