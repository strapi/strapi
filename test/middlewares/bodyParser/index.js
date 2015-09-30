'use strict';

const path = require('path');
const request = require('supertest');

const strapi = require('../../..');

const fixtures = path.join(__dirname, 'fixtures');

describe('bodyparser', function () {
  describe('json body', function () {
    const app = strapi.server();

    app.keys = ['a', 'b'];
    app.use(strapi.middlewares.bodyparser());

    it('should parse json body ok', function (done) {
      app.use(strapi.middlewares.bodyparser());

      app.use(function * () {
        this.request.body.should.eql({
          foo: 'bar'
        });
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .send({
          foo: 'bar'
        })
        .expect({
          foo: 'bar'
        }, done);
    });

    it('should parse json body with json-api headers ok', function (done) {
      app.use(strapi.middlewares.bodyparser());

      app.use(function * () {
        this.request.body.should.eql({
          foo: 'bar'
        });
        this.body = this.request.body;
      });
      request(app.listen())
        .post('/')
        .set('Accept', 'application/vnd.api+json')
        .set('Content-type', 'application/vnd.api+json')
        .send('{"foo": "bar"}')
        .expect({
          foo: 'bar'
        }, done);
    });

    it('should parse json patch', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];
      app.use(strapi.middlewares.bodyparser());

      app.use(function * () {
        this.request.body.should.eql([{
          op: 'add',
          path: '/foo',
          value: 'bar'
        }]);
        this.body = this.request.body;
      });

      request(app.listen())
        .patch('/')
        .set('Content-type', 'application/json-patch+json')
        .send('[{"op": "add", "path": "/foo", "value": "bar"}]')
        .expect([{
          op: 'add',
          path: '/foo',
          value: 'bar'
        }], done);
    });

    it('should json body reach the limit size', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        jsonLimit: 100
      }));

      app.use(function * () {
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .send(require(path.join(fixtures, 'raw.json')))
        .expect(413, done);
    });

    it('should json body error with string in strict mode', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        jsonLimit: 100
      }));

      app.use(function * () {
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .set('Content-type', 'application/json')
        .send('"invalid"')
        .expect(400, done);
    });

    it('should json body ok with string not in strict mode', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        jsonLimit: 100,
        strict: false
      }));

      app.use(function * () {
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .set('Content-type', 'application/json')
        .send('"valid"')
        .expect(200)
        .expect('valid', done);
    });

    describe('opts.detectJSON', function () {
      it('should parse json body on /foo.json request', function (done) {
        const app = strapi.server();

        app.keys = ['a', 'b'];

        app.use(strapi.middlewares.bodyparser({
          detectJSON: function (ctx) {
            return /\.json/i.test(ctx.path);
          }
        }));

        app.use(function * () {
          this.request.body.should.eql({
            foo: 'bar'
          });
          this.body = this.request.body;
        });

        request(app.listen())
          .post('/foo.json')
          .send(JSON.stringify({
            foo: 'bar'
          }))
          .expect({
            foo: 'bar'
          }, done);
      });

      it('should not parse json body on /foo request', function (done) {
        const app = strapi.server();

        app.keys = ['a', 'b'];

        app.use(strapi.middlewares.bodyparser({
          detectJSON: function (ctx) {
            return /\.json/i.test(ctx.path);
          }
        }));

        app.use(function * () {
          this.body = this.request.body;
        });

        request(app.listen())
          .post('/foo')
          .send(JSON.stringify({
            foo: 'bar'
          }))
          .expect({
            '{"foo":"bar"}': ''
          }, done);
      });
    });
  });

  describe('form body', function () {
    const app = strapi.server();

    app.keys = ['a', 'b'];
    app.use(strapi.middlewares.bodyparser());

    it('should parse form body ok', function (done) {
      app.use(function * () {
        this.request.body.should.eql({
          foo: {
            bar: 'baz'
          }
        });
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .type('form')
        .send({
          foo: {
            bar: 'baz'
          }
        })
        .expect({
          foo: {
            bar: 'baz'
          }
        }, done);
    });

    it('should parse form body reach the limit size', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        formLimit: 10
      }));

      request(app.listen())
        .post('/')
        .type('form')
        .send({
          foo: {
            bar: 'bazzzzzzz'
          }
        })
        .expect(413, done);
    });
  });

  describe('extent type', function () {
    it('should extent json ok', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        extendTypes: {
          json: 'application/x-javascript'
        }
      }));

      app.use(function * () {
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .type('application/x-javascript')
        .send(JSON.stringify({
          foo: 'bar'
        }))
        .expect({
          foo: 'bar'
        }, done);
    });

    it('should extent json with array ok', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(strapi.middlewares.bodyparser({
        extendTypes: {
          json: ['application/x-javascript', 'application/y-javascript']
        }
      }));

      app.use(function * () {
        this.body = this.request.body;
      });

      request(app.listen())
        .post('/')
        .type('application/x-javascript')
        .send(JSON.stringify({
          foo: 'bar'
        }))
        .expect({
          foo: 'bar'
        }, done);
    });
  });

  describe('other type', function () {
    const app = strapi.server();

    app.keys = ['a', 'b'];
    app.use(strapi.middlewares.bodyparser());

    it('should get body null', function (done) {
      app.use(function * () {
        this.request.body.should.eql({});
        done();
      });

      request(app.listen())
        .get('/')
        .end(function () {});
    });
  });

  describe('onerror', function () {
    const app = strapi.server();

    app.keys = ['a', 'b'];

    app.use(strapi.middlewares.bodyparser({
      onerror: function (err, ctx) {
        ctx.throw('custom parse error', 422);
      }
    }));

    it('should get custom error message', function (done) {
      app.use(function * () {});

      request(app.listen())
        .post('/')
        .send('test')
        .set('content-type', 'application/json')
        .expect(422)
        .expect('custom parse error', done);
    });
  });
});
