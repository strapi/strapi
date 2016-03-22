---
title: WebSockets
---

[Socket.IO](http://socket.io/) enables real-time bidirectional event-based communication. It works on every platform, browser or device, focusing equally on reliability and speed.

## Configuration

Configuration:

- Key: `websockets`
- Environment: all
- Location: `./config/general.json`
- Type: `boolean`

Example:

```js
{
  "websockets": true
}
```

Notes:

- Set to `false` to disable websockets with [Socket.IO](http://socket.io/).

## Usage

By default Strapi binds [Socket.IO](http://socket.io/) and your common websockets features are available using the `io` object.

```js
io.on('connection', function (socket) {
  socket.emit('news', {
    hello: 'world'
  });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
```
