'use strict';

const { isNil, camelCase } = require('lodash/fp');
const Koa = require('koa');
const createError = require('http-errors');
const delegate = require('delegates');
const statuses = require('statuses');
const { formatHttpError } = require('../errors');

const addCustomMethods = (app) => {
  const delegator = delegate(app.context, 'response');

  /* errors */
  statuses.codes
    .filter((code) => code >= 400 && code < 600)
    .forEach((code) => {
      const name = statuses(code);
      const camelCasedName = camelCase(name);
      app.response[camelCasedName] = function responseCode(message, details = {}) {
        const httpError = createError(code, message, { details });
        const { status, body } = formatHttpError(httpError);
        this.status = status;
        this.body = body;
      };
      delegator.method(camelCasedName);
    });

  /* send, created, deleted */
  app.response.send = function send(data, status = 200) {
    this.status = status;
    this.body = data;
  };

  app.response.created = function created(data) {
    this.status = 201;
    this.body = data;
  };

  app.response.deleted = function deleted(data) {
    if (isNil(data)) {
      this.status = 204;
    } else {
      this.status = 200;
      this.body = data;
    }
  };

  delegator.method('send').method('created').method('deleted');

  return app;
};

const createKoaApp = ({ proxy, keys }) => {
  const app = new Koa({ proxy });
  app.keys = keys;

  addCustomMethods(app);

  return app;
};

module.exports = createKoaApp;
