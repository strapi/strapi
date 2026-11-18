import { describe, expect, it } from 'vitest';
import { set } from '../objects';

describe('set', () => {
  it('copies only the updated path and keeps the assigned value by reference', () => {
    const unchanged = { enabled: true };
    const original = { properties: { fields: ['title'], unchanged }, other: unchanged };
    const fields = ['title', 'slug'];

    const result = set(original, 'properties.fields', fields);

    expect(result).not.toBe(original);
    expect(result.properties).not.toBe(original.properties);
    expect(result.properties.fields).toBe(fields);
    expect(result.properties.unchanged).toBe(unchanged);
    expect(result.other).toBe(unchanged);
    expect(original.properties.fields).toEqual(['title']);
  });

  it('copies array containers without changing other items', () => {
    const original = { blocks: [{ name: 'first' }, { name: 'second' }] };

    const result = set(original, ['blocks', 0, 'name'], 'updated');

    expect(result.blocks).not.toBe(original.blocks);
    expect(result.blocks[0]).not.toBe(original.blocks[0]);
    expect(result.blocks[1]).toBe(original.blocks[1]);
    expect(result.blocks[0].name).toBe('updated');
    expect(original.blocks[0].name).toBe('first');
  });

  it('creates missing array and object containers', () => {
    expect(set({}, 'blocks[0].title', 'created')).toEqual({ blocks: [{ title: 'created' }] });
  });

  it('supports literal dotted keys with array paths', () => {
    const original = { 'literal.key': { value: 1 } };
    expect(set(original, ['literal.key', 'value'], 2)).toEqual({ 'literal.key': { value: 2 } });
    expect(original['literal.key'].value).toBe(1);
  });

  it.each(['__proto__.polluted', 'constructor.prototype.polluted', 'nested.__proto__.polluted'])(
    'does not write through unsafe path %s',
    (path) => {
      const original = { nested: {} };
      set(original, path, true);
      expect(Object.prototype).not.toHaveProperty('polluted');
      expect(original).toEqual({ nested: {} });
    }
  );
});

it('updates an existing literal dotted property without interpreting it as a nested path', () => {
  const original = { 'list.mainField': 'old', list: { mainField: 'nested' } };

  const result = set(original, 'list.mainField', 'new');

  expect(result).toEqual({ 'list.mainField': 'new', list: { mainField: 'nested' } });
  expect(result.list).toBe(original.list);
});

it('does not change inherited containers', () => {
  const inherited = { properties: { fields: ['title'] } };
  const original = Object.create(inherited);

  const result = set(original, 'properties.fields', ['slug']);

  expect(result.properties.fields).toEqual(['slug']);
  expect(inherited.properties.fields).toEqual(['title']);
});
