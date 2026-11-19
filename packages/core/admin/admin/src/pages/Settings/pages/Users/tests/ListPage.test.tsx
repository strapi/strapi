import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
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

  it('shows the plugin filter in the filter bar and sends it apart from the core filters', async () => {
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
      initialEntries: [
        '/?filters[$and][0][firstname][$eq]=John&filters[$and][1][plugin::spaces.space][$eq]=france',
      ],
    });

    expect(await screen.findByText('Space $eq france')).toBeInTheDocument();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('plugins[spaces][$and][0][space][$eq]')).toBe('france');
    // The core filters keep only the core entries
    expect(requests[0].searchParams.get('filters[$and][0][firstname][$eq]')).toBe('John');
    expect(requests[0].search).not.toContain('plugin::');
  });

  it('adds the plugin filter through the filter popover', async () => {
    const { user } = render(<ListPageCE />, {
      providerOptions,
    });

    await user.click(await screen.findByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Space' }));
    await user.click(screen.getByRole('combobox', { name: 'Space' }));
    await user.click(await screen.findByRole('option', { name: 'France' }));
    // As in the Filters tests: the popover's submit button needs a plain click event
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    expect(await screen.findByText('Space $eq france')).toBeInTheDocument();
  });
});
