import { cloneDeep } from 'lodash';

class MiddleWares {
  middlewares = [];

  add(middleware) {
    console.log('add: ', middleware);
    this.middlewares.push(middleware);
  }

  get middlewares() {
    return cloneDeep(this.middlewares);
  }
}

export default () => new MiddleWares();
