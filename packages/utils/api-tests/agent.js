'use strict';

const { clone, has, concat, isNil } = require('lodash/fp');
const qs = require('qs');
const request = require('supertest');
const { createUtils } = require('./utils');

const getAuthorizationHeader = (headers) =>
  headers ? headers.Authorization || headers.authorization : undefined;

const applyHeadersToRequest = (rq, headers) => {
  if (!headers) {
    return;
  }

  const authHeader = getAuthorizationHeader(headers);
  if (typeof authHeader === 'string') {
    const parts = authHeader.split(/\s+/);
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (token) {
      rq.auth(token, { type: 'bearer' });
    }
  }

  const { Authorization, authorization, ...rest } = headers;
  if (Object.keys(rest).length > 0) {
    rq.set(rest);
  }
};

const createAgent = (strapi, initialState = {}) => {
  const state = clone(initialState);
  const utils = createUtils(strapi);

  const agent = (options) => {
    const { method, url, body, formData, qs: queryString, headers } = options;
    const supertestAgent = request.agent(strapi.server.httpServer);

    const fullUrl = concat(state.urlPrefix, url).join('');

    const rq = supertestAgent[method.toLowerCase()](fullUrl);

    if (has('token', state)) {
      rq.auth(state.token, { type: 'bearer' });
    }
    if (headers) {
      applyHeadersToRequest(rq, headers);
    } else if (has('headers', state)) {
      const stateHeaders = state.headers;
      applyHeadersToRequest(rq, stateHeaders);
    }

    if (queryString) {
      rq.query(qs.stringify(queryString));
    }

    if (body) {
      rq.send(body);
    }

    if (formData) {
      const attachFieldToRequest = (field) => rq.field(field, formData[field]);
      Object.keys(formData).forEach(attachFieldToRequest);
    }

    if (isNil(formData)) {
      rq.type('application/json');
    }

    return rq;
  };

  const createShorthandMethod =
    (method) =>
    (url, options = {}) => {
      return agent({ ...options, url, method });
    };

  Object.assign(agent, {
    assignState(newState) {
      Object.assign(state, newState);
      return agent;
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

    setHeaders(headers) {
      return this.assignState({ headers });
    },

    asHTTPS() {
      const httpsHeaders = { 'x-forwarded-proto': 'https', 'x-forwarded-port': '443' };
      const merged = Object.assign({}, state.headers || {}, httpsHeaders);
      return this.setHeaders(merged);
    },

    getLoggedUser() {
      return state.loggedUser;
    },

    async login(userInfo) {
      const { token, user } = await utils.login(userInfo);

      this.setToken(token).setLoggedUser(user);

      return agent;
    },

    async registerOrLogin(userCredentials) {
      const { token, user } = await utils.registerOrLogin(userCredentials);

      this.setToken(token).setLoggedUser(user);

      return agent;
    },

    get: createShorthandMethod('GET'),
    post: createShorthandMethod('POST'),
    put: createShorthandMethod('PUT'),
    delete: createShorthandMethod('DELETE'),
  });

  return agent;
};

module.exports = {
  createAgent,
};
