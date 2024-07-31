import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { CreateLocale, GetLocales, Locale } from '../../shared/contracts/locales';

const LOCALES = [
  {
    id: 1,
    code: 'en',
    name: 'English',
    isDefault: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 2,
    code: 'fr',
    name: 'Français',
    isDefault: false,
    createdAt: '',
    updatedAt: '',
  },
] satisfies GetLocales.Response;

export const server = setupServer(
  ...[
    /**
     *
     * locales
     *
     */
    rest.get('/i18n/locales', (req, res, ctx) => {
      return res(ctx.json(LOCALES));
    }),
    rest.post('/i18n/locales', async (req, res, ctx) => {
      const body = await req.json<Pick<Locale, 'code' | 'name' | 'isDefault'>>();

      const newLocale = {
        id: LOCALES.length + 1,
        createdAt: '',
        updatedAt: '',
        ...body,
      } satisfies CreateLocale.Response;

      return res(ctx.json(newLocale));
    }),
  ]
);
