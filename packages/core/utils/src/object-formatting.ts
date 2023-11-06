import _ from 'lodash';

const removeUndefined = <T extends object>(obj: T) =>
  _.pickBy(obj, (value) => typeof value !== 'undefined');

const keysDeep = (obj: object, path: string[] = []): string[] =>
  !_.isObject(obj)
    ? [path.join('.')]
    : _.reduce(
        obj,
        (acc, next, key) => _.concat(acc, keysDeep(next, [...path, key])),
        [] as string[]
      );

export { removeUndefined, keysDeep };
