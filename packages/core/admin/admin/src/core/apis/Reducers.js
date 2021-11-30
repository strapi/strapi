class Reducers {
  constructor({ appReducers }) {
    this.reducers = { ...appReducers };
  }

  add(reducerName, reducer) {
    this.reducers[reducerName] = reducer;
  }
}

export default ({ appReducers }) => new Reducers({ appReducers });
