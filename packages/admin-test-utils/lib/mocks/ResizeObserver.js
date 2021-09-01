'use strict';

class ResizeObserverMock {
  constructor() {
    this.disconnect = () => null;
    this.observe = () => null;
    this.unobserve = () => null;
  }
}

global.ResizeObserver = ResizeObserverMock;
