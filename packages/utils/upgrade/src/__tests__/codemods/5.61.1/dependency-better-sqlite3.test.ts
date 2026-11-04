import path from 'node:path';

import type { Utils } from '@strapi/types';
import transform from '../../../../resources/codemods/5.61.1/dependency-better-sqlite3.json';
import { createJSONTransformAPI } from '../../../modules/json';

const cwd = '/project';
const params = { cwd, json: createJSONTransformAPI };

const run = (json: Utils.JSONObject, filePath = path.join(cwd, 'package.json')) => {
  return transform({ path: filePath, json }, params);
};

describe('5.61.1 dependency-better-sqlite3 codemod', () => {
  test('upgrades an older exact version to 13.0.3', () => {
    const out = run({ name: 'app', dependencies: { 'better-sqlite3': '12.11.1' } });

    expect(out).toStrictEqual({ name: 'app', dependencies: { 'better-sqlite3': '13.0.3' } });
  });

  test('does not downgrade a newer version', () => {
    const json = { dependencies: { 'better-sqlite3': '13.1.0' } };

    expect(run(json)).toStrictEqual(json);
  });

  test('leaves version ranges untouched', () => {
    const json = { dependencies: { 'better-sqlite3': '^12.0.0' } };

    expect(run(json)).toStrictEqual(json);
  });

  test('does nothing when better-sqlite3 is not a dependency', () => {
    const json = { dependencies: { pg: '8.20.0' } };

    expect(run(json)).toStrictEqual(json);
  });

  test('ignores package.json files other than the project root', () => {
    const json = { dependencies: { 'better-sqlite3': '12.11.1' } };

    expect(run(json, path.join(cwd, 'src', 'plugins', 'foo', 'package.json'))).toStrictEqual(json);
  });
});
