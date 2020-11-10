'use strict';

// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');
// eslint-disable-next-line node/no-extraneous-require
const qs = require('qs');
const request = require('supertest');
const { createUtils } = require('./utils');

const createAgent = (strapi, initialState = {}) => {
  const _state = initialState;
  const _utils = createUtils(strapi);

  const _agent = options => {
    const { method, url, body, qs: queryString } = options;
    const agent = request.agent(strapi.server);

    if (_.has(_state, 'token')) {
      agent.auth(_state.token, { type: 'bearer' });
    }

    const rq = agent[method.toLowerCase()](url);

    if (queryString) {
      rq.query(qs.stringify(queryString));
    }

    if (body) {
      rq.send(body);
    }

    rq.set('Content-Type', 'application/json');

    return rq;
  };

  Object.assign(_agent, {
    setState(state) {
      Object.assign(_state, state);
      return this;
    },

    setToken(token) {
      return this.setState({ token });
    },

    setLoggedUser(loggedUser) {
      return this.setState({ loggedUser });
    },

    get loggedUser() {
      return _state.loggedUser;
    },

    async login(userInfo) {
      const { token, user } = await _utils.login(userInfo);

      this.setToken(token).setLoggedUser(user);

      return this;
    },

    async registerOrLogin(userCredentials) {
      const { token, user } = await _utils.registerOrLogin(userCredentials);

      this.setToken(token).setLoggedUser(user);

      return this;
    },
  });

  return _agent;
};

module.exports = {
  createAgent,
};

