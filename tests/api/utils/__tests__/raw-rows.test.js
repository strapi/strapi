'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { rowsFromRaw } = require('../raw-rows');

describe('rowsFromRaw', () => {
  it('reads Postgres rows', () => {
    assert.deepEqual(rowsFromRaw({ rows: [{ id: 1 }] }), [{ id: 1 }]);
  });

  it('reads the MySQL [rows, fields] tuple instead of counting fields as a row', () => {
    const rows = [{ id: 1 }];
    const fields = [{ name: 'id' }];
    assert.deepEqual(rowsFromRaw([rows, fields]), rows);
    assert.deepEqual(rowsFromRaw([[], fields]), []);
  });

  it('reads a SQLite row array', () => {
    assert.deepEqual(rowsFromRaw([{ id: 1 }, { id: 2 }]), [{ id: 1 }, { id: 2 }]);
  });
});
