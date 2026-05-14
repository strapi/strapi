/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { render } from '@testing-library/react';

import { useElementOnScreen } from '../useElementOnScreen';

const observeMock = jest.fn();
const disconnectMock = jest.fn();

class MockIntersectionObserver {
  observe = observeMock;
  disconnect = disconnectMock;
  unobserve = jest.fn();
  takeRecords = jest.fn();
  constructor(public callback: IntersectionObserverCallback) {}
}

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

describe('useElementOnScreen', () => {
  it('should call IntersectionObserver.observe when the ref is assigned to an element', () => {
    const callback = jest.fn();

    const TestComponent = () => {
      const ref = useElementOnScreen<HTMLDivElement>(callback);
      return <div ref={ref}></div>;
    };

    render(<TestComponent />);

    expect(observeMock).toHaveBeenCalled();
  });

  it('should disconnect the observer when the component unmounts', () => {
    const callback = jest.fn();

    const TestComponent = () => {
      const ref = useElementOnScreen<HTMLDivElement>(callback);
      return <div ref={ref}></div>;
    };

    const { unmount } = render(<TestComponent />);
    unmount();

    expect(disconnectMock).toHaveBeenCalled();
  });
});
