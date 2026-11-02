import _ from 'lodash';

const keysDeep = (obj: object, path: string[] = []): string[] =>
  !_.isObject(obj)
    ? [path.join('.')]
    : _.reduce(
        obj,
        (acc, next, key) => _.concat(acc, keysDeep(next, [...path, key])),
        [] as string[]
      );

/**
 * Sets a property without changing the input. Copies containers on the updated path and
 * preserves references to unrelated values, including the value being assigned.
 */
const set = <T extends object>(object: T, path: _.PropertyPath, value: unknown): T =>
  _.setWith(_.clone(object), path, value, (current) =>
    _.isObject(current) ? _.clone(current) : undefined
  );

export { keysDeep, set };
