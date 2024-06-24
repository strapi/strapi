import { getChildrenMaxDepth, getComponentDepth } from '../getMaxDepth';

import type { ComponentWithChildren } from '../../components/DataManagerProvider/utils/retrieveComponentsThatHaveComponents';
import type { NestedComponent } from '../../components/DataManagerProvider/utils/retrieveNestedComponents';

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
});
