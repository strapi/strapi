'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('csrf', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.csrf === 'function');
  });

  it('expects a thrown error if no session object', function (done) {
    const app = mock({
      csrf: true
    }, true);

    request(app.listen())
      .get('/')
      .expect(500, done);
  });

  it('GETs have a CSRF token', function (done) {
    const router = strapi.middlewares.router();
    const app = mock({
      csrf: true
    });

    router.get('/csrf', function * () {
      this.body = {
        token: this.state._csrf
      };
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.listen())
      .get('/csrf')
      .expect(200)
      .end(function (err, res) {
        assert(!err);
        assert(res.body.token);
        done();
      });
  });

  // it('POST (200 OK with token)', function (done) {
  //   const router = strapi.middlewares.router();
  //   const app = mock({
  //     csrf: true
  //   });
  //
  //   router.get('/csrf', function * () {
  //     this.body = {
  //       token: this.state._csrf
  //     };
  //   });
  //
  //   router.post('/csrf', function * () {
  //     this.body = {
  //       token: this.state._csrf
  //     };
  //   });
  //
  //   app.use(router.routes());
  //   app.use(router.allowedMethods());
  //
  //   request(app.listen())
  //     .get('/csrf')
  //     .expect(200, function (err, res) {
  //       assert(!err);
  //       request(app.listen())
  //         .post('/csrf')
  //         .set('cookie', res.headers['set-cookie'].join(';'))
  //         .send({
  //           _csrf: res.body.token
  //         })
  //         .expect(200, done);
  //     });
  // });

  it('POST (403 Forbidden on no token)', function (done) {
    const app = mock({
      csrf: true
    });

    request(app.listen())
      .post('/')
      .expect(403, done);
  });

//   it('should allow custom keys (session type: {value})', function (done) {
//     const router = strapi.middlewares.router();
//     const app = mock({
//       csrf: {
//         key: 'foobar'
//       }
//     });
//
//     router.all('/csrf', function * () {
//       this.body = {
//         token: this.state.foobar
//       };
//     });
//
//     app.use(router.routes());
//     app.use(router.allowedMethods());
//
//     request(app.listen())
//       .get('/csrf')
//       .expect(200, function (err, res) {
//         assert(!err);
//         request(app.listen())
//           .post('/csrf')
//           .set('cookie', res.headers['set-cookie'].join(';'))
//           .send({
//             foobar: res.body.token
//           })
//           .expect(200, done);
//       });
//   });
//
//   it('token can be sent through header instead of post body (session type: {value})', function (done) {
//     const router = strapi.middlewares.router();
//     const app = mock({
//       csrf: true
//     });
//
//     router.all('/csrf', function * () {
//       this.body = {
//         token: this.state._csrf
//       };
//     });
//
//     app.use(router.routes());
//     app.use(router.allowedMethods());
//
//     request(app.listen())
//       .get('/csrf')
//       .expect(200, function (err, res) {
//         assert(!err);
//         request(app.listen())
//           .post('/csrf')
//           .set('cookie', res.headers['set-cookie'].join(';'))
//           .set('x-csrf-token', res.body.token)
//           .send({
//             name: 'Test'
//           })
//           .expect(200, done);
//       });
//   });
//
//   it('should allow custom headers (session type: {value})', function (done) {
//     const router = strapi.middlewares.router();
//     const app = mock({
//       csrf: {
//         header: 'x-xsrf-token',
//         secret: 'csrfSecret'
//       }
//     });
//
//     router.all('/csrf', function * () {
//       this.body = {
//         token: this.state._csrf
//       };
//     });
//
//     app.use(router.routes());
//     app.use(router.allowedMethods());
//
//     request(app.listen())
//       .get('/csrf')
//       .expect(200, function (err, res) {
//         assert(!err);
//         request(app.listen())
//           .post('/csrf')
//           .set('cookie', res.headers['set-cookie'].join(';'))
//           .set('x-xsrf-token', res.body.token)
//           .send({
//             name: 'Test'
//           })
//           .expect(200, done);
//       });
//   });
//
//   it('should allow custom functions (session type: {value})', function (done) {
//     const router = strapi.middlewares.router();
//     const myToken = require('./mocks/token');
//
//     const mockConfig = {
//       csrf: {
//         impl: myToken
//       }
//     };
//
//     const app = mock(mockConfig);
//
//     router.all('/csrf', function * () {
//       this.body = {
//         token: this.state._csrf
//       };
//     });
//
//     app.use(router.routes());
//     app.use(router.allowedMethods());
//
//     request(app.listen())
//       .get('/csrf')
//       .expect(200, function (err, res) {
//         assert(!err);
//         assert(myToken.value === res.body.token);
//         request(app.listen())
//           .post('/csrf')
//           .set('cookie', res.headers['set-cookie'].join(';'))
//           .send({
//             _csrf: res.body.token
//           })
//           .expect(200, done);
//       });
//   });
});
