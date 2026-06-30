import { isNil } from 'lodash/fp';
import Koa from 'koa';
import createError from 'http-errors';
import delegate from 'delegates';
import { formatHttpError } from '../errors';
import { errorMethodEntries } from './koa-methods';

const addCustomMethods = (app: Koa) => {
  const delegator = delegate(app.context, 'response');

  /* errors */
  for (const { code, statusName, methodName } of errorMethodEntries()) {
    app.response[methodName] = function responseCode(response = statusName, details = {}) {
      const httpError = createError(code, response, { details });
      const { status, body } = formatHttpError(httpError);
      this.status = status;
      this.body = body;
    };

    delegator.method(methodName);
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
