'use strict';

const koa = require('koa');
const request = require('supertest');

describe('Errors middleware', () => {
  test('_explicitStatus still exists', done => {
    // Since we are using an internal variable of koa in our code,
    // we check that it doesn't change in newer updates
    const app = new koa();

    app.use(async ctx => {
      ctx.body = 'hello';
      expect(ctx.response._explicitStatus).toBe(true);
    });

    expect.assertions(1);

    request(app.callback())
      .get('/')
      .end(done);
  });
});
