class Reducers {
  constructor({ appReducers }) {
    this.reducers = { ...appReducers };
  }

  add(reducers) {
    Object.keys(reducers).forEach(reducerName => {
      this.reducers[reducerName] = reducers[reducerName];
    });
  }
}

export default ({ appReducers }) => new Reducers({ appReducers });
