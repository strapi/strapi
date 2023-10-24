/* eslint-disable check-file/filename-naming-convention */

import { Reducer, ReducersMapObject } from '@reduxjs/toolkit';

interface ReducerConstructorArgs {
  appReducers?: ReducersMapObject;
}

export class Reducers {
  reducers: ReducersMapObject;

  constructor({ appReducers = {} }: ReducerConstructorArgs = {}) {
    this.reducers = { ...appReducers };
  }

  add(reducerName: string, reducer: Reducer) {
    this.reducers[reducerName] = reducer;
  }
}
