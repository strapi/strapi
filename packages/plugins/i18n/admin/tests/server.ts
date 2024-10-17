import { http, HttpResponse } from 'msw';
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
    http.get('/i18n/locales', () => {
      return HttpResponse.json(LOCALES);
    }),
    http.post<never, Pick<Locale, 'code' | 'name' | 'isDefault'>>(
      '/i18n/locales',
      async ({ request }) => {
        const body = await request.json();

        const newLocale = {
          id: LOCALES.length + 1,
          createdAt: '',
          updatedAt: '',
          ...body,
        } satisfies CreateLocale.Response;

        return HttpResponse.json(newLocale);
      }
    ),
    http.put('/i18n/locales/:id', () => {
      return new HttpResponse(null, { status: 200 });
    }),
    http.delete('/i18n/locales/:id', ({ params }) => {
      if (params.id === '1') {
        return new HttpResponse(null, { status: 200 });
      }

      return new HttpResponse(null, { status: 404 });
    }),
    /**
     *
     * iso-locales
     *
     */
    http.get('/i18n/iso-locales', () => {
      return HttpResponse.json([
        { code: 'af', name: 'Afrikaans (af)' },
        { code: 'af-NA', name: 'Afrikaans (Namibia) (af-NA)' },
        { code: 'af-ZA', name: 'Afrikaans (South Africa) (af-ZA)' },
        { code: 'agq', name: 'Aghem (agq)' },
      ]);
    }),
  ]
);
