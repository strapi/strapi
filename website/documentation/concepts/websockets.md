# WebSockets

[Socket.IO](http://socket.io/) enables real-time bidirectional event-based communication. It works on every platform, browser or device, focusing equally on reliability and speed.

!!! warning
    Strapi doesn't handle WebSockets using multiple nodes yet. WebSockets only work on the master process. You can disable the WebSockets and implement Socket.IO with Redis on your own. Feel free to [join us on Slack](http://slack.strapi.io/) to talk about it.

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

- Set to `false` to disable websockets with Socket.IO.

## Usage

By default Strapi binds Socket.IO and your common websockets features are available using the `io` object.

Server-side example:

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

Browser-side example:

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  var socket = io('http://localhost:1337');
  socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
      my: 'data'
    });
  });
</script>
```
