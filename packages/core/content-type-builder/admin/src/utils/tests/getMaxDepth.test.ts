import {
  getChildrenMaxDepth,
  getComponentDepth,
  getDzDepth,
  getMaxDownwardDzDepth,
} from '../getMaxDepth';

import type { ComponentWithChildren } from '../../components/DataManager/utils/retrieveComponentsThatHaveComponents';
import type { NestedComponent } from '../../components/DataManager/utils/retrieveNestedComponents';
import type { Components } from '../../types';

const componentsWithChildComponents: Array<ComponentWithChildren> = [
  {
    component: 'basic.parent-compo',
    childComponents: [
      {
        component: 'basic.nested-compo1',
      },
    ],
  },
  {
    component: 'basic.nested-compo5',
    childComponents: [
      {
        component: 'basic.nested-compo6',
      },
    ],
  },
  {
    component: 'basic.nested-compo4',
    childComponents: [
      {
        component: 'basic.nested-compo5',
      },
    ],
  },
  {
    component: 'basic.nested-compo3',
    childComponents: [
      {
        component: 'basic.nested-compo4',
      },
    ],
  },
  {
    component: 'basic.nested-compo2',
    childComponents: [
      {
        component: 'basic.nested-compo3',
      },
    ],
  },
  {
    component: 'basic.nested-compo1',
    childComponents: [
      {
        component: 'basic.nested-compo2',
      },
    ],
  },
  {
    component: 'basic.another-parent-compo',
    childComponents: [
      {
        component: 'basic.nested-compo6',
      },
    ],
  },
  {
    component: 'default.openingtimes',
    childComponents: [
      {
        component: 'default.dish',
      },
      {
        component: 'basic.nested-compo3',
      },
    ],
  },
  {
    component: 'default.closingperiod',
    childComponents: [
      {
        component: 'default.dish',
      },
    ],
  },
];

const nestedComponents: Array<NestedComponent> = [
  {
    component: 'default.dish',
    uidsOfAllParents: ['default.openingtimes', 'default.closingperiod'],
  },
  {
    component: 'basic.nested-compo1',
    uidsOfAllParents: ['basic.parent-compo'],
  },
  {
    component: 'basic.nested-compo6',
    uidsOfAllParents: ['basic.nested-compo5', 'basic.another-parent-compo'],
  },
  {
    component: 'basic.nested-compo5',
    uidsOfAllParents: ['basic.nested-compo4'],
  },
  {
    component: 'basic.nested-compo4',
    uidsOfAllParents: ['basic.nested-compo3'],
  },
  {
    component: 'basic.nested-compo3',
    uidsOfAllParents: ['basic.nested-compo2'],
  },
  {
    component: 'basic.nested-compo2',
    uidsOfAllParents: ['basic.nested-compo1'],
  },
];

describe('Component Depth Calculations', () => {
  describe('getMaxDepth', () => {
    it('A component with no child component should have 0 max depth', () => {
      const componentsMaxDepth = getChildrenMaxDepth(
        'basic.nested-compo6',
        componentsWithChildComponents
      );

      expect(componentsMaxDepth).toEqual(0);
    });

    it('should accurately give the max depth of components children', () => {
      const componentsMaxDepth = getChildrenMaxDepth(
        'default.openingtimes',
        componentsWithChildComponents
      );

      expect(componentsMaxDepth).toEqual(4);
    });
  });

  describe('getComponentDepth', () => {
    it('A component depth should reflect its position in the component tree', () => {
      expect(getComponentDepth('basic.nested-compo1', nestedComponents)).toEqual(1);
      expect(getComponentDepth('basic.nested-compo4', nestedComponents)).toEqual(4);
      expect(getComponentDepth('basic.nested-compo6', nestedComponents)).toEqual(6);
    });
  });

  describe('getDzDepth', () => {
    it('should return 0 for a component not in the list', () => {
      expect(getDzDepth('unknown.component', [])).toEqual(0);
    });

    it('should return 0 for a component nested only via component attributes', () => {
      const components: Array<NestedComponent> = [
        {
          component: 'basic.child',
          uidsOfAllParents: ['basic.parent'],
          dzParentUids: [],
        },
      ];
      expect(getDzDepth('basic.child', components)).toEqual(0);
    });

    it('should return 1 for a component directly inside a DZ', () => {
      // ComponentA -> (dz) -> ComponentB
      const components: Array<NestedComponent> = [
        {
          component: 'basic.comp-b',
          uidsOfAllParents: ['basic.comp-a'],
          dzParentUids: ['basic.comp-a'],
        },
      ];
      expect(getDzDepth('basic.comp-b', components)).toEqual(1);
    });

    it('should propagate DZ depth through component edges', () => {
      // ComponentA -> (dz) -> ComponentB -> (component) -> ComponentC
      // ComponentC's DZ depth = 1 (inherits B's DZ nesting)
      const components: Array<NestedComponent> = [
        {
          component: 'basic.comp-b',
          uidsOfAllParents: ['basic.comp-a'],
          dzParentUids: ['basic.comp-a'],
        },
        {
          component: 'basic.comp-c',
          uidsOfAllParents: ['basic.comp-b'],
          dzParentUids: [],
        },
      ];
      expect(getDzDepth('basic.comp-c', components)).toEqual(1);
    });

    it('should count multiple DZ transitions in a chain', () => {
      // ComponentA -> (dz) -> ComponentB -> (dz) -> ComponentC
      // ComponentC's DZ depth = 2
      const components: Array<NestedComponent> = [
        {
          component: 'basic.comp-b',
          uidsOfAllParents: ['basic.comp-a'],
          dzParentUids: ['basic.comp-a'],
        },
        {
          component: 'basic.comp-c',
          uidsOfAllParents: ['basic.comp-b'],
          dzParentUids: ['basic.comp-b'],
        },
      ];
      expect(getDzDepth('basic.comp-c', components)).toEqual(2);
    });
  });

  describe('getMaxDownwardDzDepth', () => {
    const makeComp = (attrs: Array<Record<string, unknown>>) =>
      ({ attributes: attrs }) as unknown as Components[string];

    it('should return 0 for an unknown component', () => {
      expect(getMaxDownwardDzDepth('unknown.comp' as any, {})).toEqual(0);
    });

    it('should return 0 for a component with no DZ attributes', () => {
      const components = {
        'basic.leaf': makeComp([{ type: 'text' }]),
      } as unknown as Components;
      expect(getMaxDownwardDzDepth('basic.leaf' as any, components)).toEqual(0);
    });

    it('should return 1 for a component that has a DZ with leaf children', () => {
      // A -> (dz) -> [B]   where B has no DZ
      const components = {
        'basic.a': makeComp([{ type: 'dynamiczone', components: ['basic.b'] }]),
        'basic.b': makeComp([{ type: 'text' }]),
      } as unknown as Components;
      expect(getMaxDownwardDzDepth('basic.a' as any, components)).toEqual(1);
    });

    it('should return 0 for a component whose child (via component attr) has no DZ', () => {
      // A -> (component) -> B   where B has no DZ
      const components = {
        'basic.a': makeComp([{ type: 'component', component: 'basic.b' }]),
        'basic.b': makeComp([{ type: 'text' }]),
      } as unknown as Components;
      expect(getMaxDownwardDzDepth('basic.a' as any, components)).toEqual(0);
    });

    it('should count DZ depth through component edges', () => {
      // A -> (component) -> B -> (dz) -> [C]
      const components = {
        'basic.a': makeComp([{ type: 'component', component: 'basic.b' }]),
        'basic.b': makeComp([{ type: 'dynamiczone', components: ['basic.c'] }]),
        'basic.c': makeComp([{ type: 'text' }]),
      } as unknown as Components;
      expect(getMaxDownwardDzDepth('basic.a' as any, components)).toEqual(1);
    });

    it('should count chained DZ transitions', () => {
      // A -> (dz) -> [B] -> (dz) -> [C]
      const components = {
        'basic.a': makeComp([{ type: 'dynamiczone', components: ['basic.b'] }]),
        'basic.b': makeComp([{ type: 'dynamiczone', components: ['basic.c'] }]),
        'basic.c': makeComp([{ type: 'text' }]),
      } as unknown as Components;
      expect(getMaxDownwardDzDepth('basic.a' as any, components)).toEqual(2);
    });
  });
});
