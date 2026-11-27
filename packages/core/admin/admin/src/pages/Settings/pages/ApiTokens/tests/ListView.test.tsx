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
      initialEntries: ['/?plugins[spaces][space]=france'],
    });

    expect(await screen.findByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('plugins[spaces][space]')).toBe('france');
  });

  it('says that no token matches the filter instead of inviting to create the first one', async () => {
    server.use(http.get('/admin/api-tokens', () => HttpResponse.json({ data: [] })));

    const { user } = render(<ListView />, {
      providerOptions,
      initialEntries: ['/?plugins[spaces][space]=france'],
    });

    expect(
      await screen.findByText('No API token matches the selected filters')
    ).toBeInTheDocument();
    expect(screen.queryByText('Add your first API Token')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('Add your first API Token')).toBeInTheDocument();
  });

  it('ignores the plugin values of a stale link that no dropdown reads', async () => {
    const requests: URL[] = [];

    server.use(
      http.get('/admin/api-tokens', ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({ data: [] });
      })
    );

    render(<ListView />, {
      providerOptions,
      initialEntries: ['/?plugins[old-plugin][team]=blue'],
    });

    expect(await screen.findByText('Add your first API Token')).toBeInTheDocument();
    expect(requests[0].searchParams.has('plugins[old-plugin][team]')).toBe(false);
  });

  it('shows no Filters popover, since the server lists every token', async () => {
    render(<ListView />, {
      providerOptions: {
        runHookWaterfall: settingsListHooks({
          after: 'description',
          column: { name: 'scope', label: 'Scope' },
          filter: { name: 'name', label: 'Name', type: 'string' },
        }),
      },
    });

    expect(await screen.findByText('My super token')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument();
  });
});
