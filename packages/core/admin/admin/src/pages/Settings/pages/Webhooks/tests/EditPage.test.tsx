import { fireEvent } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useContentTypes } from '../../../../../hooks/useContentTypes';
import { EditPage } from '../EditPage';

jest.mock('../../../../../hooks/useContentTypes');

const webhook = {
  id: '1',
  name: 'Deploy',
  url: 'https://example.com/hook',
  headers: {},
  events: ['entry.create'],
  contentTypeEvents: {},
  body: { ref: 'main', event: '{{ event }}' },
  isEnabled: true,
};

const validationError = (message: string, details: unknown = {}) =>
  HttpResponse.json(
    { data: null, error: { status: 400, name: 'ValidationError', message, details } },
    { status: 400 }
  );

describe('Webhooks | EditPage', () => {
  let isFutureFlagEnabled: jest.SpyInstance;
  let sentBody: unknown;

  beforeEach(() => {
    sentBody = undefined;
    jest
      .mocked(useContentTypes)
      .mockReturnValue({ isLoading: false, collectionTypes: [], singleTypes: [] });
    isFutureFlagEnabled = jest
      .spyOn(window.strapi.future, 'isEnabled')
      .mockImplementation((name) => name === 'unstableWebhookBodyTemplate');

    server.use(http.get('/admin/webhooks/:id', () => HttpResponse.json({ data: webhook })));
  });

  afterEach(() => {
    isFutureFlagEnabled.mockRestore();
  });

  const renderPage = async () => {
    const result = render(<EditPage />, { initialEntries: ['/settings/webhooks/1'] });

    const name = await screen.findByRole('textbox', { name: /name/i });
    fireEvent.change(name, { target: { value: 'Deploy site' } });

    return result;
  };

  it('sends the body template as a JSON object', async () => {
    server.use(
      http.put('/admin/webhooks/:id', async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json({ data: { ...webhook, ...(sentBody as object) } });
      })
    );

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sentBody).toBeDefined());
    expect(sentBody).toMatchObject({ name: 'Deploy site', body: webhook.body });
  });

  it('shows a body error from the server under the template', async () => {
    const message = 'Webhook body variable unknown is not supported';

    server.use(
      http.put('/admin/webhooks/:id', () =>
        validationError(message, {
          errors: [{ path: ['body'], message, name: 'ValidationError', value: null }],
        })
      )
    );

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('notifies a validation error that points at no field, once', async () => {
    server.use(
      http.put('/admin/webhooks/:id', () =>
        validationError('Webhook event media.create is not supported')
      )
    );

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Webhook event media.create is not supported')
    ).toBeInTheDocument();
    // The page already notifies these: a second notification would duplicate it
    expect(screen.getAllByText('Webhook event media.create is not supported')).toHaveLength(1);
  });
});
