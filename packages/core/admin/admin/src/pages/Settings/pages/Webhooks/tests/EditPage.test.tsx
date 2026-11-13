import { fireEvent, render, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { EditPage } from '../EditPage';

const webhook = {
  id: 1,
  name: 'deploy',
  url: 'http://hook.internal',
  headers: {},
  events: ['entry.create'],
  isEnabled: true,
};

// The error the server sends when a `server.webhooks.destinationChecks` option blocks the URL
const blockedDestination = (option: string) =>
  HttpResponse.json(
    {
      data: null,
      error: {
        status: 400,
        name: 'ApplicationError',
        message: `hook.internal resolves to 10.0.0.5, which server.webhooks.destinationChecks.${option} blocks. Set it to false to allow it.`,
        details: { option, hostname: 'hook.internal', address: '10.0.0.5' },
      },
    },
    { status: 400 }
  );

describe('Webhooks | EditPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/admin/webhooks/:id', () => HttpResponse.json({ data: webhook })),
      // No content types, so the events table only lists the entry events
      http.get('/content-manager/content-types', () => HttpResponse.json({ data: [] }))
    );
  });

  it('explains why a blocked webhook was not triggered, without technical details', async () => {
    server.use(
      http.post('/admin/webhooks/:id/trigger', () => blockedDestination('blockPrivateNetworks'))
    );

    const { user } = render(<EditPage />, { initialEntries: ['/settings/webhooks/1'] });

    await user.click(await screen.findByRole('button', { name: 'Trigger' }));

    expect(
      await screen.findByText(
        "This URL points to a private network, so webhooks can't be sent to it. A developer can allow it in the server configuration."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/destinationChecks/)).not.toBeInTheDocument();
    // The trigger result panel isn't left waiting for a result that won't come
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it('explains once why a blocked URL was not saved', async () => {
    server.use(http.put('/admin/webhooks/:id', () => blockedDestination('blockLoopback')));

    const { user } = render(<EditPage />, { initialEntries: ['/settings/webhooks/1'] });

    const url = await screen.findByRole('textbox', { name: /url/i });
    await user.clear(url);
    await user.type(url, 'http://localhost:4000/hook');
    // As in the WebhookForm tests, `user.click` doesn't submit this form here and `fireEvent` does
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findAllByText(
        "This URL points to this server, so webhooks can't be sent to it. A developer can allow it in the server configuration."
      )
    ).toHaveLength(1);
    expect(screen.queryByText(/destinationChecks/)).not.toBeInTheDocument();
  });
});
