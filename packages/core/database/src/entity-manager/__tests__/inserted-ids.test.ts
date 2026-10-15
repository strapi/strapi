import { idsFromInsertResult } from '../inserted-ids';

describe('idsFromInsertResult', () => {
  it('expands a MySQL first-insert-id into one id per inserted row', () => {
    expect(idsFromInsertResult([8], 2, false)).toEqual([8, 9]);
    expect(idsFromInsertResult([8], 550, false)).toHaveLength(550);
    expect(idsFromInsertResult([8], 550, false)[549]).toBe(557);
  });

  it('leaves RETURNING dialects and single-row inserts unchanged', () => {
    expect(idsFromInsertResult([{ id: 1 }, { id: 2 }], 2, true)).toEqual([1, 2]);
    expect(idsFromInsertResult([4], 1, false)).toEqual([4]);
  });

  it('does not invent ids when the driver did not return an auto-increment id', () => {
    expect(idsFromInsertResult([0], 3, false)).toEqual([0]);
  });
});
