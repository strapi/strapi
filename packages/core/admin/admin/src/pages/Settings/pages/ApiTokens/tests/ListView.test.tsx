import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { settingsListHooks, SPACE_FILTER } from '../../../../../../tests/settingsListHooks';
import { ListView } from '../ListView';

import type { ApiToken } from '../../../../../../../shared/contracts/api-token';

const providerOptions = {
  runHookWaterfall: settingsListHooks({
    after: 'description',
    column: {
      name: 'scope',
      label: 'Scope',
      cellFormatter: (token: ApiToken) => <span>scope of {token.name}</span>,
    },
    filter: SPACE_FILTER,
  }),
};

describe('API tokens | ListView | plugin columns and filters', () => {
  it('shows the plugin column after the core column it names', async () => {
    render(<ListView />, {
      providerOptions,
    });

    const cell = await screen.findByText('scope of My super token');
    const cells = Array.from(cell.closest('tr')!.querySelectorAll('td'));
    const headers = Array.from(document.querySelectorAll('thead th'), (th) => th.textContent);

    expect(cells.indexOf(cell.closest('td')!)).toBe(2);
    expect(headers.indexOf('Scope')).toBe(headers.indexOf('Description') + 1);
  });

  it('sends the plugin filter value with the tokens request', async () => {
    const requests: URL[] = [];

    server.use(
      http.get('/admin/api-tokens', ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({ data: [] });
      })
    );

    render(<ListView />, {
      providerOptions,
      initialEntries: ['/?filters[$and][0][plugin::spaces.space][$eq]=france'],
    });

    expect(await screen.findByText('Space $eq france')).toBeInTheDocument();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('plugins[spaces][$and][0][space][$eq]')).toBe('france');
  });

  it('says that no token matches the filter instead of inviting to create the first one', async () => {
    server.use(http.get('/admin/api-tokens', () => HttpResponse.json({ data: [] })));

    render(<ListView />, {
      providerOptions,
      initialEntries: ['/?filters[$and][0][plugin::spaces.space][$eq]=france'],
    });

    expect(await screen.findByText('No content found')).toBeInTheDocument();
    expect(screen.queryByText('Add your first API Token')).not.toBeInTheDocument();
  });
});
