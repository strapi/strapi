import _ from 'lodash';

const keysDeep = (obj: object, path: string[] = []): string[] =>
  !_.isObject(obj)
    ? [path.join('.')]
    : _.reduce(obj, (acc, next, key) => acc.concat(keysDeep(next, [...path, key])), [] as string[]);

export { keysDeep };
