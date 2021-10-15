'use strict';

/**
 * @typedef {import('koa')} Koa
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const http = require('http');

/**
 * @param {Strapi} strapi
 * @param {Koa} koaApp
 */
const createHTTPServer = (strapi, koaApp) => {
  const connections = new Set();

  /**
   * lazy creation of the request listener
   * @type {ReturnType<Koa['callback']>}
   */

  let handler;

  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  const listener = function handleRequest(req, res) {
    if (!handler) {
      handler = koaApp.callback();
    }

    return handler(req, res);
  };

  /**
   * @type {http.Server & { destroy?: () => Promise<void> }}
   */
  const server = http.createServer(listener);

  server.on('connection', connection => {
    connections.add(connection);

    connection.on('close', () => {
      connections.delete(connection);
    });
  });

  // handle port in use cleanly
  server.on(
    'error',
    /** @param {any} err **/ err => {
      if (err.code === 'EADDRINUSE') {
        return strapi.stopWithError(
          new Error(`The port ${err.port} is already used by another application.`)
        );
      }

      strapi.log.error(err);
    }
  );

  server.destroy = async () => {
    for (const connection of connections) {
      connection.destroy();

      connections.delete(connection);
    }

    if (!server.listening) {
      return;
    }

    return new Promise((resolve, reject) =>
      server.close(error => {
        if (error) {
          return reject(error);
        }

        resolve();
      })
    );
  };

  return server;
};

module.exports = {
  createHTTPServer,
};
