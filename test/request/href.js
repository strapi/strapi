'use strict';

const http = require('http');
const context = require('../helpers/context');
const Stream = require('stream');

const Koa = require('../..').server;

describe('ctx.href', function () {
  it('should return the full request url', function () {
    const socket = new Stream.Duplex();
    const req = {
      url: '/users/1?next=/dashboard',
      headers: {
        host: 'localhost'
      },
      socket: socket,
      __proto__: Stream.Readable.prototype
    };

    const ctx = context(req);
    ctx.href.should.equal('http://localhost/users/1?next=/dashboard');
    ctx.url = '/foo/users/1?next=/dashboard';
    ctx.href.should.equal('http://localhost/users/1?next=/dashboard');
  });

  it('should work with `GET http://example.com/foo`', function (done) {
    const app = new Koa();

    app.use(function * () {
      this.body = this.href;
    });

    app.listen(function () {
      const address = this.address();
      http.get({
        host: 'localhost',
        path: 'http://example.com/foo',
        port: address.port
      }, function (res) {
        res.statusCode.should.equal(200);
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', function (s) {
          buf += s;
        });
        res.on('end', function () {
          buf.should.equal('http://example.com/foo');
          done();
        });
      });
    });
  });
});
