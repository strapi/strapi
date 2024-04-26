import { isNil, camelCase } from 'lodash/fp';
import Koa from 'koa';
import createError from 'http-errors';
import delegate from 'delegates';
import statuses from 'statuses';
import { formatHttpError } from '../errors';

declare module 'koa' {
  interface BaseResponse {
    send: (data: any, status?: number) => void;
    created: (data: any) => void;
    deleted: (data: any) => void;
    _explicitStatus: boolean;
    [key: string]: (message: string, details?: unknown) => void;
  }
}

const addCustomMethods = (app: Koa) => {
  const delegator = delegate(app.context, 'response');

  /* errors */
  statuses.codes
    .filter((code) => code >= 400 && code < 600)
    .forEach((code) => {
      const name = statuses(code);

      const camelCasedName = camelCase(name);
      app.response[camelCasedName] = function responseCode(message = name, details = {}) {
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

const createKoaApp = ({ proxy, keys }: { proxy: boolean; keys: string[] }) => {
  const app = new Koa({ proxy });
  app.keys = keys;

  addCustomMethods(app);

  return app;
};

export default createKoaApp;
