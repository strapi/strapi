/* eslint-disable check-file/filename-naming-convention */
import { Middleware } from '@reduxjs/toolkit';

import { RootState } from '../store/configure';

type TypedMiddleware = () => Middleware<object, RootState>;

class Middlewares {
  middlewares: Array<TypedMiddleware>;

  constructor() {
    this.middlewares = [];
  }

  add(middleware: TypedMiddleware) {
    this.middlewares.push(middleware);
  }
}

export { Middlewares, TypedMiddleware as Middleware };
