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
    rest.put('/i18n/locales/:id', (req, res, ctx) => {
      return res(ctx.status(200));
    }),
    rest.delete('/i18n/locales/:id', (req, res, ctx) => {
      if (req.params.id === '1') {
        return res(ctx.status(200));
      }

      return res(ctx.status(404));
    }),
    /**
     *
     * iso-locales
     *
     */
    rest.get('/i18n/iso-locales', (req, res, ctx) => {
      return res(
        ctx.json([
          { code: 'af', name: 'Afrikaans (af)' },
          { code: 'af-NA', name: 'Afrikaans (Namibia) (af-NA)' },
          { code: 'af-ZA', name: 'Afrikaans (South Africa) (af-ZA)' },
          { code: 'agq', name: 'Aghem (agq)' },
        ])
      );
    }),
  ]
);
