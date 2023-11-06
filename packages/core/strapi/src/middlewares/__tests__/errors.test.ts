import Koa from 'koa';
import request from 'supertest';

describe('Errors middleware', () => {
  test('_explicitStatus still exists', async () => {
    // Since we are using an internal variable of koa in our code,
    // we check that it doesn't change in newer updates
    const app = new Koa();

    app.use(async (ctx) => {
      ctx.body = 'hello';
      expect(ctx.response._explicitStatus).toBe(true);
    });

    expect.assertions(1);

    await request(app.callback()).get('/');
  });
});
