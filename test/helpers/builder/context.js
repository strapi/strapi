'use strict';

const { merge } = require('lodash/fp');

const getDefaultState = () => ({ actions: [], models: [], fixtures: {} });

const createContext = (initialState) => {
  let state;

  const contextApi = {
    get state() {
      return state;
    },

    addAction(action) {
      state.actions.push(action);
      return this;
    },

    addModel(model) {
      state.models.push(model);
      return this;
    },

    addFixtures(modelName, entries) {
      state.fixtures = merge(state.fixtures, { [modelName]: entries });
      return this;
    },

    resetState() {
      return this.setState({ ...getDefaultState(), ...initialState });
    },

    setState(newState) {
      state = newState;
      return this;
    },
  };

  return contextApi.resetState();
};

module.exports = { createContext };
