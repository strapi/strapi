import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { TemplateDetail, TemplateSummary } from '../../shared/contracts/templates';

export const SUMMARIES: TemplateSummary[] = [
  {
    key: 'end-users.confirm-email',
    description: 'Asks a new user to confirm their email address',
    locales: ['en', 'fr'],
    customized: true,
  },
  {
    key: 'end-users.reset-password',
    description: 'Sends a password reset link',
    locales: ['en'],
    customized: false,
  },
  {
    key: 'orders.receipt',
    description: 'Receipt for an order',
    locales: ['en'],
    customized: false,
  },
];

export const DETAIL: TemplateDetail = {
  key: 'end-users.confirm-email',
  locale: 'en',
  subject: 'Confirm your email',
  html: '<p>Hello {{ name }}</p>',
  text: 'Hello {{ name }}',
  variables: ['name', 'url'],
  isDefault: false,
};

export const server = setupServer(
  http.get('/email/templates', ({ request }) => {
    const prefix = new URL(request.url).searchParams.get('prefix');

    return HttpResponse.json({
      data: prefix ? SUMMARIES.filter((summary) => summary.key.startsWith(prefix)) : SUMMARIES,
    });
  }),
  http.get('/email/templates/:key', ({ request }) => {
    const locale = new URL(request.url).searchParams.get('locale') ?? 'en';

    return HttpResponse.json({
      data: {
        ...DETAIL,
        locale,
        subject: locale === 'en' ? DETAIL.subject : `${DETAIL.subject} (${locale})`,
      },
    });
  }),
  http.put('/email/templates/:key', async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;

    return HttpResponse.json({ data: { ...DETAIL, ...body } });
  }),
  http.delete('/email/templates/:key', () => HttpResponse.json({ data: { ok: true } })),
  http.post('/email/templates/:key/test', () => HttpResponse.json({ data: { ok: true } })),
  http.get('/i18n/locales', () => new HttpResponse(null, { status: 404 }))
);
