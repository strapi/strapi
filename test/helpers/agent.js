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
    const { method, url, body, formData, qs: queryString } = options;
    const agent = request.agent(strapi.server);

    if (_.has(_state, 'token')) {
      agent.auth(_state.token, { type: 'bearer' });
    }

    const fullUrl = _.concat(_state.urlPrefix, url).join('');

    const rq = agent[method.toLowerCase()](fullUrl);

    if (queryString) {
      rq.query(qs.stringify(queryString));
    }

    if (body) {
      rq.send(body);
    }

    if (formData) {
      const attachFieldToRequest = field => rq.field(field, formData[field]);
      Object.keys(formData).forEach(attachFieldToRequest);
    }

    if (_.isNil(formData)) {
      rq.type('application/json');
    }

    return rq;
  };

  const createShorthandMethod = method => (url, options = {}) => {
    return _agent({ ...options, url, method });
  };

  Object.assign(_agent, {
    assignState(state) {
      Object.assign(_state, state);
      return _agent;
    },

    setURLPrefix(path) {
      return this.assignState({ urlPrefix: path });
    },

    setToken(token) {
      return this.assignState({ token });
    },

    setLoggedUser(loggedUser) {
      return this.assignState({ loggedUser });
    },

    getLoggedUser() {
      return _state.loggedUser;
    },

    async login(userInfo) {
      const { token, user } = await _utils.login(userInfo);

      this.setToken(token).setLoggedUser(user);

      return _agent;
    },

    async registerOrLogin(userCredentials) {
      const { token, user } = await _utils.registerOrLogin(userCredentials);

      this.setToken(token).setLoggedUser(user);

      return _agent;
    },

    get: createShorthandMethod('GET'),
    post: createShorthandMethod('POST'),
    put: createShorthandMethod('PUT'),
    delete: createShorthandMethod('DELETE'),
  });

  return _agent;
};

module.exports = {
  createAgent,
};
