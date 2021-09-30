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
  rest.get('*/not-working-like-cors.lutin', (req, res, ctx) => res(ctx.json({})))
);

// export const mockAssets = url => {
//   if (url === 'http://localhost:5000/an-image.png') {
//     const headers = { get: () => 'image/png' };

//     return Promise.resolve({ url: 'http://localhost:5000/an-image.png', headers });
//   }

//   if (url === 'http://localhost:5000/a-pdf.pdf') {
//     const headers = { get: () => 'application/pdf' };

//     return Promise.resolve({ url: 'http://localhost:5000/a-pdf.pdf', headers });
//   }

//   if (url === 'http://localhost:5000/a-video.mp4') {
//     const headers = { get: () => 'video/mp4' };

//     return Promise.resolve({ url: 'http://localhost:5000/a-video.mp4', headers });
//   }

//   // eslint-disable-next-line prefer-promise-reject-errors
//   return Promise.reject('http://localhost:5000/not-working-like-cors.lutin');
// };
