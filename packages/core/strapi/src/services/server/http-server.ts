import http from 'http';
import type { Socket } from 'net';
import Koa from 'koa';
import type { Strapi } from '@strapi/types';

export interface Server extends http.Server {
  destroy: () => Promise<void>;
}

const createHTTPServer = (strapi: Strapi, koaApp: Koa): Server => {
  const connections = new Set<Socket>();

  // lazy creation of the request listener
  let handler: http.RequestListener;
  const listener: http.RequestListener = function handleRequest(req, res) {
    if (!handler) {
      handler = koaApp.callback();
    }

    return handler(req, res);
  };

  const server: http.Server = http.createServer(listener);
  // disable the request timeout introduced by Node 18 so we can set our own on a per-request basis
  server.headersTimeout = 0;

  server.on('connection', (connection) => {
    connections.add(connection);

    connection.on('close', () => {
      connections.delete(connection);
    });
  });

  server.on('request', (req, res) => {
    let timeout = 90000;
    // if it's a websocket request, set the timeout much higher
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
      timeout = 1000 * 60 * 60 * 8; // 8 hours
    }

    req.socket.setTimeout(timeout, () => {
      req.emit('ERR_HTTP_REQUEST_TIMEOUT');
    });
  });

  // handle port in use cleanly
  server.on('error', (err) => {
    if ('code' in err && 'port' in err && err.code === 'EADDRINUSE') {
      return strapi.stopWithError(`The port ${err.port} is already used by another application.`);
    }

    strapi.log.error(err);
  });

  const destroy = async () => {
    for (const connection of connections) {
      connection.destroy();

      connections.delete(connection);
    }

    if (!server.listening) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  return Object.assign(server, { destroy });
};

export { createHTTPServer };
