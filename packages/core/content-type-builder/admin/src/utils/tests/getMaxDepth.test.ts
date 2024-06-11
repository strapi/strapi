import { getChildrenMaxDepth } from '../getMaxDepth';

import type { ComponentWithChildren } from '../../components/DataManagerProvider/utils/retrieveComponentsThatHaveComponents';

const components: Array<ComponentWithChildren> = [
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

describe('getMaxDepth', () => {
  test('A component with no child component should have 0 max depth', () => {
    const componentsMaxDepth = getChildrenMaxDepth('basic.nested-compo6', components);

    expect(componentsMaxDepth).toEqual(0);
  });

  test('should accurately give the max depth of components children', () => {
    const componentsMaxDepth = getChildrenMaxDepth('default.openingtimes', components);

    expect(componentsMaxDepth).toEqual(4);
  });
});
