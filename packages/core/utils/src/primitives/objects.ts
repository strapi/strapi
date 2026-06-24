import _ from 'lodash';

const keysDeep = (obj: object, path: string[] = []): string[] =>
  !_.isObject(obj)
    ? [path.join('.')]
    : Object.entries(obj).reduce(
        (acc: string[], [key, next]) => acc.concat(keysDeep(next as object, [...path, key])),
        [] as string[]
      );

export { keysDeep };
