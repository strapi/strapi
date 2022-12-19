'use strict';

const { WebSocket } = require('ws');

const websocket = async (ctx) => {
  const options = {};

  const upgradeHeader = (ctx.request.headers.upgrade || '')
    .split(',')
    .map((s) => s.trim().toLowerCase());

  const wss = new WebSocket.Server({ ...options.wsOptions, noServer: true });

  // eslint-disable-next-line no-bitwise
  if (~upgradeHeader.indexOf('websocket')) {
    wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws, ctx.req);
      ws.on('message', (args) => {
        try {
          const message = JSON.parse(args.toString());
          console.log(message);
        } catch (e) {
          //
        }
      });
    });
    ctx.respond = false;
    if (options.exposeServerOn) ctx[options.exposeServerOn] = wss;
  }

  // TODO: add listeners
};

module.exports = {
  websocket,
};
