import { idsForInsertedRows, idsFromInsertResult } from '../inserted-ids';

describe('idsFromInsertResult', () => {
  it('expands a MySQL first-insert-id into one id per inserted row', () => {
    expect(idsFromInsertResult([8], 2, false)).toEqual([8, 9]);
    expect(idsFromInsertResult([8], 550, false)).toHaveLength(550);
    expect(idsFromInsertResult([8], 550, false)[549]).toBe(557);
  });

  it('steps MySQL ids by auto_increment_increment', () => {
    expect(idsFromInsertResult([8], 3, false, 2)).toEqual([8, 10, 12]);
  });

  it('leaves RETURNING dialects and single-row inserts unchanged', () => {
    expect(idsFromInsertResult([{ id: 1 }, { id: 2 }], 2, true)).toEqual([1, 2]);
    expect(idsFromInsertResult([4], 1, false)).toEqual([4]);
  });

  it('does not invent ids when the driver did not return an auto-increment id', () => {
    expect(idsFromInsertResult([0], 3, false)).toEqual([0]);
  });

  it('keeps explicit primary keys instead of expanding the MySQL insert id', () => {
    expect(idsForInsertedRows([{ id: 5 }, { id: 9 }], [5], false)).toEqual([5, 9]);
  });

  it('expands generated MySQL ids when the rows omit a primary key', () => {
    expect(idsForInsertedRows([{ title: 'a' }, { title: 'b' }], [8], false)).toEqual([8, 9]);
  });
});
