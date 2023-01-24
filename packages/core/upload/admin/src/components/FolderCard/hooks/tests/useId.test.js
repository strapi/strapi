import { renderHook } from '@testing-library/react';

import useId from '../useId';

function setup(...args) {
  const { result } = renderHook((...props) => useId(...props), {
    initialProps: args,
  });

  return result.current;
}

describe('useId', () => {
  let id;

  test('increments', () => {
    id = setup('one');

    expect(id).toBe('one-1');

    id = setup('one');

    expect(id).toBe('one-2');
  });

  test('works with namespaces', () => {
    id = setup('two');

    expect(id).toBe('two-3');
  });
});
