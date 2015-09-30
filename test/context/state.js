'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../..');

describe('ctx.state', function () {
  it('should provide a ctx.state namespace', function (done) {
    const app = strapi.server();

    app.use(function * () {
      assert.deepEqual(this.state, {});
    });

    request(app.listen())
      .get('/')
      .expect(404)
      .end(done);
  });
});
