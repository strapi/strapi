import getComponentErrorKeys from '../getComponentErrorKeys';

describe('getComponentErrorKeys', () => {
  test('retrieves error keys for non nested components', () => {
    const FIXTURE = {
      'component.0.name': 'unique-error',
      'component.1.field': 'validation-error',
    };

    expect(getComponentErrorKeys('component', FIXTURE)).toStrictEqual([
      'component.0',
      'component.1',
    ]);
  });

  test('retrieves error keys for nested components', () => {
    const FIXTURE = {
      'parent.child.0.name': 'unique-error',
      'parent.child.1.field': 'validation-error',
    };

    expect(getComponentErrorKeys('parent.child', FIXTURE)).toStrictEqual([
      'parent.child.0',
      'parent.child.1',
    ]);
  });
});
