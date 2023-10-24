/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention */

type TMiddleware = () => unknown;

class Middlewares {
  middlewares: TMiddleware[];

  constructor() {
    this.middlewares = [];
  }

  add(middleware: TMiddleware) {
    this.middlewares.push(middleware);
  }
}

export default () => new Middlewares();
