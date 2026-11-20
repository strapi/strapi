import path from 'path';
import { describe, it, expect } from 'vitest';

import SqliteDialect from '../index';
import type { Database } from '../../..';

const createDialect = () => new SqliteDialect({} as Database);

describe('SqliteDialect.configure', () => {
  it('keeps the special :memory: filename as is', () => {
    const connection = { filename: ':memory:' };

    createDialect().configure(connection);

    expect(connection.filename).toBe(':memory:');
  });

  it('resolves a relative filename against the cwd', () => {
    const connection = { filename: 'test.db' };

    createDialect().configure(connection);

    expect(connection.filename).toBe(path.resolve('test.db'));
  });

  it('leaves an absolute filename unchanged', () => {
    const filename = path.resolve('test.db');
    const connection = { filename };

    createDialect().configure(connection);

    expect(connection.filename).toBe(filename);
  });
});
