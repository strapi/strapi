import { getChildrenMaxDepth, type ComponentWithChildren } from '../getMaxDepth';

const components: Array<ComponentWithChildren> = [
  {
    component: 'basic.parent-compo',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo1',
        name: 'compofield',
      },
    ],
  },
  {
    component: 'basic.nested-compo5',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo6',
        name: 'again',
      },
    ],
  },
  {
    component: 'basic.nested-compo4',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo5',
        name: 'againsomecompo',
      },
    ],
  },
  {
    component: 'basic.nested-compo3',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo4',
        name: 'somecompo',
      },
    ],
  },
  {
    component: 'basic.nested-compo2',
    childComponents: [
      {
        repeatable: true,
        component: 'basic.nested-compo3',
        name: 'somecompo',
      },
    ],
  },
  {
    component: 'basic.nested-compo1',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo2',
        name: 'compofield',
      },
    ],
  },
  {
    component: 'basic.another-parent-compo',
    childComponents: [
      {
        repeatable: false,
        component: 'basic.nested-compo6',
        name: 'somecompo',
      },
    ],
  },
  {
    component: 'default.openingtimes',
    childComponents: [
      {
        repeatable: true,
        component: 'default.dish',
        name: 'dishrep',
      },
      {
        repeatable: true,
        component: 'basic.nested-compo3',
        name: 'somecompo',
      },
    ],
  },
  {
    component: 'default.closingperiod',
    childComponents: [
      {
        component: 'default.dish',
        repeatable: true,
        required: true,
        min: 2,
        name: 'dish',
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
