'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

/**
 * Serves the fixture for any URL the Strapi app fetches, so "upload from URL"
 * needs no internet.
 *
 * The app fetches those URLs server-side and `fetchUrlToInputFile` refuses
 * loopback and private addresses to prevent SSRF, so the suite cannot simply
 * host the file. Instead `strapi.fetch` is pointed here via `server.proxy.fetch`
 * and the URL under test uses a reserved documentation address (RFC 5737), which
 * the guard allows and which nothing ever actually connects to.
 */
const FIXTURE = path.join(__dirname, '..', 'e2e', 'data', 'uploads', 'test-image.jpg');

const port = Number(process.env.E2E_UPLOAD_PROXY_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(
    `upload-url-proxy: E2E_UPLOAD_PROXY_PORT must be a port number, got "${process.env.E2E_UPLOAD_PROXY_PORT}"`
  );
}

const body = fs.readFileSync(FIXTURE);

const server = http.createServer((req, res) => {
  // Playwright's webServer readiness probe. A direct request, not a proxied one.
  if (req.url === '/__health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  res.writeHead(200, {
    // The fixture is a 1x1 PNG despite its .jpg name. Serving the honest type lets
    // the test assert what landed, so a network that answers for the unroutable
    // address (some ISPs return an HTML error page) fails loudly instead of
    // uploading that page under the expected filename.
    'Content-Type': 'image/png',
    'Content-Length': body.length,
  });
  res.end(body);
});

// undici's ProxyAgent tunnels through `CONNECT` rather than sending absolute-form
// requests. Accept the tunnel, then hand the socket back to this same server so the
// plaintext request inside it is served normally.
server.on('connect', (req, socket) => {
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  server.emit('connection', socket);
});

server.listen(port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`upload-url-proxy: serving ${path.basename(FIXTURE)} on 127.0.0.1:${port}`);
});
