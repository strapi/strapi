import { describe, it, expect } from 'vitest';

import { create, addCondition, getProperty, sanitizePermissionFields } from '../index';

describe('permission domain', () => {
  it('does not share default conditions or properties between created permissions', () => {
    const first = create({ action: 'first' });
    first.conditions.push('only-first');
    first.properties.modified = true;

    expect(create({ action: 'second' })).toEqual({
      action: 'second',
      conditions: [],
      properties: {},
      subject: null,
    });
  });

  it('supports partial application without changing the original permission', () => {
    const properties = { fields: ['title'] };
    const permission = { action: 'test', conditions: ['first'], properties };
    const addSecond = addCondition('second');

    const updated = addSecond(permission);

    expect(updated.conditions).toEqual(['first', 'second']);
    expect(permission.conditions).toEqual(['first']);
    expect(updated.properties).toBe(properties);
    expect(getProperty('fields')(updated)).toBe(properties.fields);
  });

  it('create picks permission fields and applies defaults', () => {
    const permission = create({
      action: 'plugin::users-permissions.user.find',
      subject: 'plugin::users-permissions.user',
      extra: 'ignored',
    });

    expect(permission).toEqual({
      action: 'plugin::users-permissions.user.find',
      subject: 'plugin::users-permissions.user',
      conditions: [],
      properties: {},
    });
  });

  it('sanitizePermissionFields keeps only known fields', () => {
    const sanitized = sanitizePermissionFields({
      action: 'test',
      subject: 'test',
      properties: { fields: ['title'] },
      conditions: ['admin::is-creator'],
      unknown: true,
    });

    expect(sanitized).toEqual({
      action: 'test',
      subject: 'test',
      properties: { fields: ['title'] },
      conditions: ['admin::is-creator'],
    });
    expect(sanitized).not.toHaveProperty('unknown');
  });

  it('addCondition appends unique conditions', () => {
    const base = create({ action: 'test', conditions: ['a'] });
    const updated = addCondition('b', addCondition('a', base));

    expect(updated.conditions).toEqual(['a', 'b']);
  });

  it('addCondition initializes conditions when missing', () => {
    const base = create({ action: 'test' });
    const updated = addCondition('admin::is-creator', base);

    expect(updated.conditions).toEqual(['admin::is-creator']);
  });

  it('getProperty reads nested properties', () => {
    const permission = create({
      action: 'test',
      properties: { fields: ['title', 'slug'] },
    });

    expect(getProperty('fields', permission)).toEqual(['title', 'slug']);
  });
});
