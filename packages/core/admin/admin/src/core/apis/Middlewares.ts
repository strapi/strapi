/* eslint-disable check-file/filename-naming-convention */
import { Middleware } from '@reduxjs/toolkit';

import { RootState } from '../store/configure';

export class Middlewares {
  middlewares: Array<Middleware<object, RootState>>;

  constructor() {
    this.middlewares = [];
  }

  add(middleware: Middleware<object, RootState>) {
    this.middlewares.push(middleware);
  }
}
