import getFieldName from '../getFieldName';

describe('CONTENT MANAGER | UTILS | getFieldName', () => {
  it('should return an array with path of the field name', () => {
    expect(getFieldName('test')).toEqual(['test']);

    // Component single
    expect(getFieldName('test.name')).toEqual(['test', 'name']);

    // Component repeatable or DZ
    expect(getFieldName('test.0.name')).toEqual(['test', 'name']);

    // Crash test
    expect(getFieldName('test.0.name.0.sub.1.subsub')).toEqual(['test', 'name', 'sub', 'subsub']);
  });
});
