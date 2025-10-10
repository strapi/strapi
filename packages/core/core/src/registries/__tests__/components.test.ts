import type { Schema } from '@strapi/types';

import componentsRegistry from '../components';

describe('componentsRegistry', () => {
  it('should register a component', () => {
    const registry = componentsRegistry();
    const component: Schema.Component = {
      uid: 'default.compo',
      modelType: 'component',
      modelName: 'compo',
      globalId: 'myComponent',
      category: 'default',
      attributes: {},
    };

    registry.set('default.compo', component);

    expect(registry.get('default.compo')).toEqual(component);
  });

  it('should throw an error when registering a component with an existing uid', () => {
    const registry = componentsRegistry();
    const component: Schema.Component = {
      uid: 'default.compo',
      modelType: 'component',
      modelName: 'compo',
      globalId: 'myComponent',
      category: 'default',
      attributes: {},
    };

    registry.set('default.compo', component);

    expect(() => registry.set('default.compo', component)).toThrowError(
      'Component default.compo has already been registered.'
    );
  });

  it('should add multiple components', () => {
    const registry = componentsRegistry();
    const newComponents: Record<string, Schema.Component> = {
      'default.compo': {
        uid: 'default.compo',
        modelType: 'component',
        modelName: 'compo',
        globalId: 'myComponent',
        category: 'default',
        attributes: {},
      },
      'default.compo2': {
        uid: 'default.compo',
        modelType: 'component',
        modelName: 'compo',
        globalId: 'myComponent',
        category: 'default',
        attributes: {},
      },
    };

    registry.add(newComponents);
    expect(registry.getAll()).toEqual(newComponents);
  });
});
