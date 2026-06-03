import { isNil, camelCase } from 'lodash/fp';
import Koa from 'koa';
import createError from 'http-errors';
import delegate from 'delegates';
import { STATUS_CODES } from 'node:http';
import { formatHttpError } from '../errors';
import type { ContextDelegatedResponseErrorMethods } from './koa-methods';

const addCustomMethods = (app: Koa) => {
  const delegator = delegate(app.context, 'response');

  /* errors */
  for (const [codeStr, name] of Object.entries(STATUS_CODES)) {
    const code = Number(codeStr);

    if (name && code >= 400 && code < 600) {
      const camelCasedName = camelCase(name) as keyof ContextDelegatedResponseErrorMethods;

      app.response[camelCasedName] = function responseCode(message = name, details = {}) {
        const httpError = createError(code, message, { details });
        const { status, body } = formatHttpError(httpError);
        this.status = status;
        this.body = body;
      };

      delegator.method(camelCasedName);
    }
  }

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

const createKoaApp = ({ proxy, keys }: { proxy: boolean; keys: string[] }) => {
  const app = new Koa({ proxy });
  app.keys = keys;

  addCustomMethods(app);

  return app;
};

export default createKoaApp;
