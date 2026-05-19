import path from 'node:path';

import { cloneDeep, get, has, omit, set } from 'lodash/fp';
import transform from '../dependency-better-sqlite3.json';

const cwd = '/tmp/project';
const packageJsonPath = path.join(cwd, 'package.json');

const json = (object: Record<string, unknown>) => {
  let current = cloneDeep(object);

  return {
    get: (jsonPath: string) => cloneDeep(get(jsonPath, current)),
    has: (jsonPath: string) => has(jsonPath, current),
    remove(jsonPath: string) {
      current = omit(jsonPath, current);
      return json(object);
    },
    root: () => cloneDeep(current),
    set(jsonPath: string, value: unknown) {
      current = set(jsonPath, value, current);
      return json(object);
    },
  };
};

const runTransform = (packageJson: Record<string, unknown>) =>
  transform(
    {
      path: packageJsonPath,
      json: packageJson,
    },
    {
      cwd,
      json,
    }
  );

describe('dependency-better-sqlite3 codemod', () => {
  test('moves better-sqlite3 to devDependencies for postgres projects', () => {
    const result = runTransform({
      dependencies: {
        'better-sqlite3': '12.6.2',
        pg: '8.20.0',
      },
      devDependencies: {
        typescript: '^5',
      },
    });

    expect(result).toStrictEqual({
      dependencies: {
        pg: '8.20.0',
      },
      devDependencies: {
        'better-sqlite3': '12.8.0',
        typescript: '^5',
      },
    });
  });

  test('keeps better-sqlite3 in dependencies for sqlite projects', () => {
    const result = runTransform({
      dependencies: {
        'better-sqlite3': '12.6.2',
      },
    });

    expect(result).toStrictEqual({
      dependencies: {
        'better-sqlite3': '12.6.2',
      },
    });
  });

  test('updates better-sqlite3 in devDependencies for mysql projects', () => {
    const result = runTransform({
      dependencies: {
        mysql2: '3.20.0',
      },
      devDependencies: {
        'better-sqlite3': '12.6.2',
      },
    });

    expect(result).toStrictEqual({
      dependencies: {
        mysql2: '3.20.0',
      },
      devDependencies: {
        'better-sqlite3': '12.8.0',
      },
    });
  });
});
