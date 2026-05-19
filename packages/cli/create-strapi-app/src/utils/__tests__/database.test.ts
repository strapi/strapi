import { addDatabaseDependencies } from '../database';

import type { Scope } from '../../types';

const createScope = (client: Scope['database']['client']): Scope =>
  ({
    database: { client },
    dependencies: {
      '@strapi/strapi': '5.46.0',
    },
    devDependencies: {
      typescript: '^5',
    },
  }) as unknown as Scope;

describe('addDatabaseDependencies', () => {
  test('keeps better-sqlite3 in dependencies when sqlite is the selected database', () => {
    const scope = createScope('sqlite');

    addDatabaseDependencies(scope);

    expect(scope.dependencies).toMatchObject({
      '@strapi/strapi': '5.46.0',
      'better-sqlite3': '12.8.0',
    });
    expect(scope.devDependencies).toEqual({
      typescript: '^5',
    });
  });

  test('keeps postgres in dependencies and adds sqlite only as a development dependency', () => {
    const scope = createScope('postgres');

    addDatabaseDependencies(scope);

    expect(scope.dependencies).toMatchObject({
      '@strapi/strapi': '5.46.0',
      pg: '8.20.0',
    });
    expect(scope.dependencies).not.toHaveProperty('better-sqlite3');
    expect(scope.devDependencies).toMatchObject({
      typescript: '^5',
      'better-sqlite3': '12.8.0',
    });
  });

  test('keeps mysql in dependencies and adds sqlite only as a development dependency', () => {
    const scope = createScope('mysql');

    addDatabaseDependencies(scope);

    expect(scope.dependencies).toMatchObject({
      '@strapi/strapi': '5.46.0',
      mysql2: '3.20.0',
    });
    expect(scope.dependencies).not.toHaveProperty('better-sqlite3');
    expect(scope.devDependencies).toMatchObject({
      typescript: '^5',
      'better-sqlite3': '12.8.0',
    });
  });
});
