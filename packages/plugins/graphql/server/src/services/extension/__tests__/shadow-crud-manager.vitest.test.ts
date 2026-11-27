import { describe, expect, it } from 'vitest';
import type { ShadowCRUDManager } from '../../../types';
import createShadowCRUDManager from '../shadow-crud-manager';

describe('Shadow CRUD manager', () => {
  it('returns the content type manager from every disable method', () => {
    const manager = createShadowCRUDManager()('api::article.article');

    expect(manager.disable()).toBe(manager);
    expect(manager.disableQueries()).toBe(manager);
    expect(manager.disableMutations()).toBe(manager);
    expect(manager.disableAction('create')).toBe(manager);
    expect(manager.disableActions()).toBe(manager);
  });

  it('disables each action it is given', () => {
    // The registered contract types the actions: the implementation infers `never[]` from `= []`.
    const manager: ShadowCRUDManager = createShadowCRUDManager()('api::article.article');

    expect(manager.disableActions(['create', 'update'])).toBe(manager);
    expect(manager.isActionDisabled('create')).toBe(true);
    expect(manager.isActionDisabled('update')).toBe(true);
    expect(manager.isActionDisabled('delete')).toBe(false);
  });

  it('returns the field manager from every field disable method', () => {
    const field = createShadowCRUDManager()('api::article.article').field('title');

    expect(field.disableInput()).toBe(field);
    expect(field.disableOutput()).toBe(field);
    expect(field.disableFilters()).toBe(field);
    expect(field.disable()).toBe(field);
    expect(field.isEnabled()).toBe(false);
  });
});
