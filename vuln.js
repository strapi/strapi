
const http = require('http');
const url = require('url');

http.createServer( function(req, res) {
  const parsedUrl = url.parse(req.url, true);

  // Sink on 2nd arg Location field
  res.writeHead(parsedUrl.query.code, {Location: parsedUrl.query.url});

  res.end();
}).listen(3002);
