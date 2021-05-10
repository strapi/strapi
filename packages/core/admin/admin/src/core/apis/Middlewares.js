import cloneDeep from 'lodash/cloneDeep';

class Middlewares {
  middlewares = [];

  add(middleware) {
    this.middlewares.push(middleware);
  }

  get middlewares() {
    return cloneDeep(this.middlewares);
  }
}

export default () => new Middlewares();
