import React from 'react';
import { render, act } from '@testing-library/react';

import useId from '../useId';

function setup(...args) {
  let returnVal;

  function TestComponent() {
    returnVal = useId(...args);

    return null;
  }

  render(<TestComponent />);

  return returnVal;
}

describe('useId', () => {
  let id;

  test('increments', () => {
    id = setup('one');

    expect(id).toBe('one-1');

    act(() => {
      id = setup('one');
    });

    expect(id).toBe('one-2');
  });

  test('works with namespaces', () => {
    act(() => {
      id = setup('two');
    });

    expect(id).toBe('two-3');
  });
});
