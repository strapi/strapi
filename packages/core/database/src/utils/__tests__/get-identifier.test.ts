import { getIdentifier, getv4Identifier } from '../get-identifier';

describe('getIdentifier', () => {
  it('should accept a string', () => {
    const parts = 'my_database_name';
    const expectedOutput = 'my_database_name';
    expect(getIdentifier(parts)).toEqual(expectedOutput);
  });

  it('should accept a string with a suffix', () => {
    const parts = 'my_database_name';
    const expectedOutput = 'my_database_name_pk';
    expect(getIdentifier(parts, 'primary')).toEqual(expectedOutput);
  });

  it('should join parts with underscores', () => {
    const parts = ['my', 'database', 'name'];
    const expectedOutput = 'my_database_name';
    expect(getIdentifier(parts)).toEqual(expectedOutput);
  });

  it('should add suffix if provided', () => {
    const parts = ['my', 'database', 'name'];
    const expectedOutput = 'my_database_name_fk';
    expect(getIdentifier(parts, 'fk')).toEqual(expectedOutput);
  });

  it('should limit the length of the identifier to 53 characters', () => {
    const parts = ['a'.repeat(60)];
    const expectedOutput = `${'a'.repeat(46)}_11ee39`;
    expect(getIdentifier(parts)).toEqual(expectedOutput);
  });

  it('should maintain suffix when identifier is too long', () => {
    const parts = ['a'.repeat(60)];
    const expectedOutput = `${'a'.repeat(43)}_3485b6_fk`;
    expect(getIdentifier(parts, 'fk')).toEqual(expectedOutput);
  });

  it('maps suffixes to their short form', () => {
    const parts = ['my', 'database', 'name'];
    const expectedOutput = 'my_database_name_unq';
    expect(getIdentifier(parts, 'unique')).toEqual(expectedOutput);
  });

  it('maps suffixes to their short form when identifier is too long', () => {
    const parts = ['a'.repeat(60)];
    const expectedOutput = `${'a'.repeat(42)}_6b5b9c_unq`;

    expect(getIdentifier(parts, 'unique')).toEqual(expectedOutput);
    expect(getIdentifier(parts, 'unique').length).toEqual(53);
  });
});

describe('getv4Identifier', () => {
  it('should accept a string', () => {
    const parts = 'my_database_name';
    const expectedOutput = 'my_database_name';
    expect(getv4Identifier(parts)).toEqual(expectedOutput);
  });

  it('should accept a string with a suffix', () => {
    const parts = 'my_database_name';
    const expectedOutput = 'my_database_name_primary';
    expect(getv4Identifier(parts, 'primary')).toEqual(expectedOutput);
  });

  it('should have no limits', () => {
    const parts = ['a'.repeat(80)];
    const expectedOutput = `${'a'.repeat(80)}_fk`;
    expect(getv4Identifier(parts, 'fk')).toEqual(expectedOutput);
  });

  it('should join parts with underscores', () => {
    const parts = ['my', 'database', 'name'];
    const expectedOutput = 'my_database_name';
    expect(getv4Identifier(parts)).toEqual(expectedOutput);
  });

  it('should add suffix if provided', () => {
    const parts = ['my', 'database', 'name'];
    const expectedOutput = 'my_database_name_fk';
    expect(getv4Identifier(parts, 'fk')).toEqual(expectedOutput);
  });
});
