'use strict';

const fs = require('fs');

const should = require('should');
const request = require('supertest');

const assert = require('assert');
const http = require('http');
const Stream = require('stream');
const crypto = require('crypto');
const path = require('path');

const strapi = require('../../..');
const Koa = strapi.server;

describe('Compress', function() {

  describe('strapi.middlewares.compress()', function() {
    it('should work with no options', function() {
      strapi.middlewares.compress();
    });
  });

  const buffer = crypto.randomBytes(1024);
  const string = buffer.toString('hex');

  function* sendString(next) {
    this.body = string
  }

  function* sendBuffer(next) {
    this.compress = true;
    this.body = buffer
  }

  it('should compress strings', function(done) {

    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendString);

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err) return done(err);

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-length');
      res.text.should.equal(string);

      done()
    })
  });

  it('should not compress strings below threshold', function(done) {

    let app = strapi.server();
    app.use(strapi.middlewares.compress({
      threshold: '1mb'
    }));
    app.use(sendString);

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err) return done(err);

      res.should.have.header('Content-Length', '2048');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-encoding');
      res.headers.should.not.have.property('transfer-encoding');
      res.text.should.equal(string);

      done()
    })
  });

  it('should compress JSON body', function(done) {
    var jsonBody = {
      'status': 200,
      'message': 'ok',
      'data': string
    };

    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(function*(next) {
      this.body = jsonBody
    });

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      res.should.have.header('Transfer-Encoding', 'chunked');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-length');
      res.text.should.equal(JSON.stringify(jsonBody));

      done()
    })
  });

  it('should not compress JSON body below threshold', function(done) {
    var jsonBody = {
      'status': 200,
      'message': 'ok'
    };

    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(function* sendJSON(next) {
      this.body = jsonBody
    });

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-encoding');
      res.headers.should.not.have.property('transfer-encoding');
      res.text.should.equal(JSON.stringify(jsonBody));

      done()
    })
  });

  it('should compress buffers', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendBuffer);

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-length');

      done()
    })
  });

  it('should compress streams', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());

    app.use(function*(next) {
      this.type = 'application/javascript';
      this.body = fs.createReadStream(path.join(__dirname, 'index.js'))
    });

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-length');

      done()
    })
  });

  it('should compress when this.compress === true', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendBuffer);

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      //res.should.have.header('Content-Encoding', 'gzip')
      res.should.have.header('Transfer-Encoding', 'chunked');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-length');

      done()
    })
  });

  it('should not compress when this.compress === false', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(function*(next) {
      this.compress = false;
      this.body = buffer
    });

    request(app.listen()).get('/').expect(200).end(function(err, res) {
      if (err)
        return done(err);

      res.should.have.header('Content-Length', '1024');
      res.should.have.header('Vary', 'Accept-Encoding');
      res.headers.should.not.have.property('content-encoding');
      res.headers.should.not.have.property('transfer-encoding');

      done()
    })
  });

  it('should not compress HEAD requests', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendString);

    request(app.listen()).head('/').expect(200).expect('', function(err, res) {
      if (err)
        return done(err);

      res.headers.should.not.have.property('content-encoding');

      done()
    })
  });

  it('should not crash even if accept-encoding: sdch', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendBuffer);

    request(app.listen()).get('/').set('Accept-Encoding', 'sdch, gzip, deflate').expect(200, done)
  });

  it('should not crash if no accept-encoding is sent', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(sendBuffer);

    request(app.listen()).get('/').expect(200, done)
  });

  it('should not crash if a type does not pass the filter', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress());
    app.use(function*() {
      this.type = 'image/png';
      this.body = new Buffer(2048)
    });

    request(app.listen()).get('/').expect(200, done)
  });

  it('should not compress when transfer-encoding is already set', function(done) {
    let app = strapi.server();
    app.use(strapi.middlewares.compress({
      threshold: 0
    }));
    app.use(function*() {
      this.set('Content-Encoding', 'identity');
      this.type = 'text';
      this.body = 'asdf'
    });

    request(app.listen()).get('/').expect('asdf', done)
  });
});
