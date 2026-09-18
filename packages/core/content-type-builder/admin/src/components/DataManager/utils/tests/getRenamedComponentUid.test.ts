import { getRenamedComponentUid } from '../getRenamedComponentUid';

import type { Component } from '../../../../types';
import type { Internal } from '@strapi/types';

const component = (overrides: Partial<Component> = {}): Component => ({
  uid: 'default.hero' as Internal.UID.Component,
  category: 'default',
  modelName: 'hero',
  globalId: 'ComponentDefaultHero',
  modelType: 'component',
  status: 'UNCHANGED',
  info: { displayName: 'Hero', icon: 'star' },
  attributes: [],
  ...overrides,
});

describe('getRenamedComponentUid', () => {
  const initial = component();

  it('returns null when nothing that affects the uid changed', () => {
    expect(
      getRenamedComponentUid(component({ info: { displayName: 'Hero', icon: 'apps' } }), initial)
    ).toBeNull();
  });

  it('follows a category change', () => {
    expect(getRenamedComponentUid(component({ category: 'shared' }), initial)).toBe('shared.hero');
  });

  it('follows a display-name change', () => {
    expect(
      getRenamedComponentUid(component({ info: { displayName: 'Hero Banner' } }), initial)
    ).toBe('default.hero-banner');
  });

  it('follows both at once', () => {
    expect(
      getRenamedComponentUid(
        component({ category: 'shared', info: { displayName: 'Hero Banner' } }),
        initial
      )
    ).toBe('shared.hero-banner');
  });

  it('keeps the file-derived name when the display name did not change, even if it differs', () => {
    // Hand-edited schema: file `hero.json`, display name "Main Hero".
    const mismatched = component({ info: { displayName: 'Main Hero' } });
    expect(getRenamedComponentUid(mismatched, mismatched)).toBeNull();
    expect(getRenamedComponentUid({ ...mismatched, category: 'shared' }, mismatched)).toBe(
      'shared.hero'
    );
  });

  it('returns null for a component with no initial state (new component)', () => {
    expect(getRenamedComponentUid(component({ status: 'NEW' }), undefined)).toBeNull();
  });
});
