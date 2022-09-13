class Middlewares {
  constructor() {
    this.middlewares = [];
  }

  add(middleware) {
    this.middlewares.push(middleware);
  }
}

export default () => new Middlewares();
