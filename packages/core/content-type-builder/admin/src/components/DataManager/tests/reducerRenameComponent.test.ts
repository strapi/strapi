import { reducer, actions } from '../reducer';

import { initCompo, init } from './utils';

import type { Internal } from '@strapi/types';

const uid = 'default.hero' as Internal.UID.Component;

const buildState = () =>
  init({ components: { [uid]: initCompo('hero', { status: 'UNCHANGED' }) } });

const getComponent = (state: any) => state.current.components[uid];

const updateComponent = (data: { displayName: string; icon: string; category?: string }) =>
  actions.updateComponentSchema({ data, uid });

describe('CTB | DataManager | reducer | component-level rename (UPDATE_COMPONENT_SCHEMA)', () => {
  it('persists a category change (component-level rename) and marks the component CHANGED', () => {
    const state = reducer(
      buildState(),
      updateComponent({ displayName: 'Hero', icon: 'test', category: 'shared' })
    );

    const component = getComponent(state);
    expect(component.category).toBe('shared');
    expect(component.status).toBe('CHANGED');
  });

  it('keeps the original category when none is provided (display-only edit)', () => {
    const state = reducer(
      buildState(),
      updateComponent({ displayName: 'Hero Banner', icon: 'apps' })
    );

    const component = getComponent(state);
    expect(component.category).toBe('default');
    expect(component.info.displayName).toBe('Hero Banner');
    expect(component.status).toBe('CHANGED');
  });

  it('keeps the original category when the same category is provided', () => {
    const state = reducer(
      buildState(),
      updateComponent({ displayName: 'Hero', icon: 'test', category: 'default' })
    );

    expect(getComponent(state).category).toBe('default');
  });
});
