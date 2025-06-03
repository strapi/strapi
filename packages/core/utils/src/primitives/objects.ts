import _ from 'lodash';

const keysDeep = (obj: object, path: string[] = []): string[] =>
  !_.isObject(obj)
    ? [path.join('.')]
    : _.reduce(
        obj,
        (acc, next, key) => _.concat(acc, keysDeep(next, [...path, key])),
        [] as string[]
      );

export { keysDeep };
