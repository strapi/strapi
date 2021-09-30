import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('*/i18n/iso-locales', (req, res, ctx) => {
    const defaultLocales = [
      {
        code: 'af',
        name: 'Afrikaans (af)',
      },
      {
        code: 'en',
        name: 'English (en)',
      },
      {
        code: 'fr',
        name: 'French (fr)',
      },
    ];

    return res(ctx.json(defaultLocales));
  }),
  rest.get('*/i18n/locales', (req, res, ctx) => {
    const defaultLocales = [
      {
        code: 'en',
        name: 'English (en)',
        id: 2,
        isDefault: true,
      },
    ];

    return res(ctx.json(defaultLocales));
  })
);

export default server;
