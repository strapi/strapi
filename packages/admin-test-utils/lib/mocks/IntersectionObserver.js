'use strict';

class IntersectionObserverMock {
  constructor() {
    this.root = null;
    this.rootMargin = '';
    this.thresholds = [];
    this.disconnect = () => null;
    this.observe = () => null;
    this.takeRecords = () => [];
    this.unobserve = () => null;
  }
}

global.IntersectionObserver = IntersectionObserverMock;
