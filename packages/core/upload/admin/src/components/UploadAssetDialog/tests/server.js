// mocking window.fetch since msw is not able to give back the res.url param

import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  rest.get('*/an-image.png', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'image/png'), ctx.body())
  ),
  rest.get('*/a-pdf.pdf', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'application/pdf'), ctx.body())
  ),
  rest.get('*/a-video.mp4', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'video/mp4'), ctx.body())
  ),
  rest.get('*/not-working-like-cors.lutin', (req, res, ctx) => res(ctx.json({}))),
  rest.get('*/some-where-not-existing.jpg', (req, res) => res.networkError())
);
