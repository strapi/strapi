import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import Koa from 'koa';

export interface KoaCtxOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** The socket's remote address: what Koa reports as `ctx.request.ip` unless it trusts a proxy. */
  ip?: string;
  /** Koa's `app.proxy`, which makes it read `X-Forwarded-*`. */
  proxy?: boolean;
  /** Koa's `app.maxIpsCount`: how many entries, from the right, of X-Forwarded-For it believes. */
  maxIpsCount?: number;
}

/**
 * A real Koa context over a bare Node request and response, so `ip`, `protocol`, `host`, `set` and
 * `append` behave exactly as they do in Strapi. `body` is set the way Strapi's body parser sets it.
 */
export const koaCtx = ({
  method = 'GET',
  url = '/',
  headers = {},
  body,
  ip,
  proxy = false,
  maxIpsCount = 0,
}: KoaCtxOptions = {}) => {
  const app = new Koa();
  app.proxy = proxy;
  app.maxIpsCount = maxIpsCount;

  const socket = new Socket();
  Object.defineProperty(socket, 'remoteAddress', { value: ip });

  const req = new IncomingMessage(socket);
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:1337', ...headers };

  const ctx = app.createContext(req, new ServerResponse(req));
  (ctx.request as { body?: unknown }).body = body;

  return ctx;
};
