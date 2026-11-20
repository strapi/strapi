import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { settingsListHooks, SPACE_FILTER } from '../../../../../../tests/settingsListHooks';
import { ListPageCE } from '../ListPage';

import type { SanitizedAdminUser } from '../../../../../../../shared/contracts/shared';

describe('Users | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { findByText } = render(<ListPageCE />);

    await findByText('John');
    await findByText('Kai');
  });
});

const providerOptions = {
  runHookWaterfall: settingsListHooks({
    after: 'email',
    column: {
      name: 'space',
      label: 'Spaces',
      cellFormatter: (user: SanitizedAdminUser) => <span>spaces of {user.firstname}</span>,
    },
    filter: SPACE_FILTER,
  }),
};

describe('Users | ListPage | plugin columns and filters', () => {
  it('shows the plugin column after the core column it names', async () => {
    render(<ListPageCE />, {
      providerOptions,
    });

    await screen.findByText('spaces of John');

    const headers = Array.from(
      document.querySelectorAll('thead th'),
      (header) => header.textContent
    );

    expect(headers.indexOf('Spaces')).toBe(headers.indexOf('Email') + 1);
  });

  it('shows the plugin dropdown and sends its value with the core filters', async () => {
    const requests: URL[] = [];

    server.use(
      http.get('/admin/users', ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({
          data: { results: [{ id: 1, firstname: 'John', roles: [] }], pagination: { page: 1 } },
        });
      })
    );

    render(<ListPageCE />, {
      providerOptions,
      initialEntries: ['/?filters[$and][0][firstname][$eq]=John&plugins[spaces][space]=france'],
    });

    expect(await screen.findByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('plugins[spaces][space]')).toBe('france');
    expect(requests[0].searchParams.get('filters[$and][0][firstname][$eq]')).toBe('John');
  });

  it('picks a space in the dropdown and goes back to the first page', async () => {
    const requests: URL[] = [];

    server.use(
      http.get('/admin/users', ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({
          data: { results: [{ id: 1, firstname: 'John', roles: [] }], pagination: { page: 1 } },
        });
      })
    );

    const { user } = render(<ListPageCE />, { providerOptions, initialEntries: ['/?page=3'] });

    await user.click(await screen.findByRole('combobox', { name: 'Space' }));
    await user.click(await screen.findByRole('option', { name: 'France' }));

    await waitFor(() =>
      expect(requests.at(-1)!.searchParams.get('plugins[spaces][space]')).toBe('france')
    );
    expect(requests.at(-1)!.searchParams.get('page')).toBe('1');
  });
});
