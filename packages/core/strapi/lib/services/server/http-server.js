'use strict';

const http = require('http');

const createHTTPServer = (strapi, koaApp) => {
  const connections = new Set();

  // lazy creation of the request listener
  let handler;
  const listener = function handleRequest(req, res) {
    if (!handler) {
      handler = koaApp.callback();
    }

    return handler(req, res);
  };

  const server = http.createServer(listener);

  server.on('connection', connection => {
    connections.add(connection);

    connection.on('close', () => {
      connections.delete(connection);
    });
  });

  // handle port in use cleanly
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      return strapi.stopWithError(`The port ${err.port} is already used by another application.`);
    }

    strapi.log.error(err);
  });

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
