import { cloneDeep } from 'lodash';

class MiddlewaresHandler {
  middlewares = [];

  add(middleware) {
    this.middlewares.push(middleware);
  }

  get middlewares() {
    return cloneDeep(this.middlewares);
  }
}

export default () => new MiddlewaresHandler();
