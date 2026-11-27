import { describe, test, expect, vi } from 'vitest';
import createSectionBuilder from '../permission/sections-builder/builder';
import type { Action } from '../../domain/action';

const action: Action = {
  actionId: 'plugin::foo.bar',
  section: 'plugins',
  displayName: 'Bar',
  category: 'foo',
  options: { applyToProperties: null },
};

describe('Section builder', () => {
  test('Calls matchers with the action and handlers with the action and the section state', async () => {
    const state = { items: [] };
    const matcher = vi.fn(() => true);
    const handler = vi.fn();

    const builder = createSectionBuilder().createSection('foo', {
      initialStateFactory: () => state,
      handlers: [handler],
      matchers: [matcher],
    });

    await builder.build([action]);

    expect(matcher).toHaveBeenCalledWith(action);
    expect(handler).toHaveBeenCalledWith({ action, section: state });
  });

  test('Registers handlers and matchers on an existing section, and returns the builder', async () => {
    const state = { items: [] };
    const builder = createSectionBuilder().createSection('foo', {
      initialStateFactory: () => state,
    });
    const matcher = vi.fn(() => true);
    const handler = vi.fn();

    expect(builder.addMatcher('foo', matcher)).toBe(builder);
    expect(builder.addHandler('foo', handler)).toBe(builder);
    expect(builder.addHandler('missing', vi.fn())).toBe(builder);

    await expect(builder.build([action])).resolves.toEqual({ foo: state });
    expect(matcher).toHaveBeenCalledWith(action);
    expect(handler).toHaveBeenCalledWith({ action, section: state });
  });

  test('Builds every section by name, without the deleted ones', async () => {
    const builder = createSectionBuilder()
      .createSection('foo', { initialStateFactory: () => [] })
      .createSection('bar', { initialStateFactory: () => ({}) });

    expect(builder.deleteSection('bar')).toBe(builder);

    await expect(builder.build()).resolves.toEqual({ foo: [] });
  });
});
