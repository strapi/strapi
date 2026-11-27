import { render, screen } from '@tests/utils';

import {
  DATE_FILTER,
  DAY_BOUNDS,
  settingsListHooks,
  SPACE_FILTER,
} from '../../../../../../tests/settingsListHooks';
import { useAdminRoles } from '../../../../../hooks/useAdminRoles';
import { ListPage } from '../ListPage';

import type { AdminRole } from '../../../../../hooks/useAdminRoles';

jest.mock('../../../../../hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(() => ({
    roles: [
      {
        code: 'strapi-super-admin',
        created_at: '2021-08-24T14:37:20.384Z',
        description: 'Super Admins can access and manage all features and settings.',
        id: 1,
        name: 'Super Admin',
        updatedAt: '2021-08-24T14:37:20.384Z',
        usersCount: 1,
      },
    ],
    isLoading: false,
  })),
}));

describe('<ListPage />', () => {
  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });
});

const providerOptions = {
  runHookWaterfall: settingsListHooks({
    after: 'description',
    column: {
      name: 'available-in',
      label: 'Available in',
      cellFormatter: (role: AdminRole) => <span>places of {role.name}</span>,
    },
    filter: SPACE_FILTER,
  }),
};

const nameFilterOptions = {
  runHookWaterfall: settingsListHooks({
    after: 'description',
    column: { name: 'available-in', label: 'Available in' },
    filter: { name: 'name', label: 'Name', type: 'string' },
  }),
};

describe('<ListPage /> | plugin columns and filters', () => {
  it('shows the plugin column after the core column it names', async () => {
    render(<ListPage />, {
      providerOptions,
    });

    const cell = await screen.findByText('places of Super Admin');
    const cells = Array.from(cell.closest('tr')!.querySelectorAll('td'));
    const headers = Array.from(document.querySelectorAll('thead th'), (th) => th.textContent);

    expect(cells.indexOf(cell.closest('td')!)).toBe(2);
    expect(headers.slice(0, 4)).toEqual(['Name', 'Description', 'Available in', 'Users']);
  });

  it('shows the plugin dropdown and sends its value with the roles request', async () => {
    render(<ListPage />, {
      providerOptions,
      initialEntries: ['/?plugins[spaces][space]=france'],
    });

    expect(await screen.findByRole('combobox', { name: 'Space' })).toHaveTextContent('France');
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({
        plugins: { spaces: { space: 'france' } },
      }),
      expect.anything()
    );
  });

  it('sends a Filters popover filter with the search in the roles request', async () => {
    render(<ListPage />, {
      providerOptions: {
        runHookWaterfall: settingsListHooks({
          after: 'description',
          column: { name: 'available-in', label: 'Available in' },
          filter: { name: 'name', label: 'Name', type: 'string' },
        }),
      },
      initialEntries: ['/?_q=edit&filters[$and][0][name][$eq]=Editor'],
    });

    expect(await screen.findByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: { $and: [{ name: { $containsi: 'edit' } }, { name: { $eq: 'Editor' } }] },
      }),
      expect.anything()
    );
  });

  it('encodes the popover filter values and skips a malformed $and', async () => {
    render(<ListPage />, {
      providerOptions: nameFilterOptions,
      initialEntries: ['/?filters[$and][0][name][$eq]=R%26D'],
    });

    await screen.findByText('Super Admin');
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { $and: [{ name: { $eq: 'R%26D' } }] } }),
      expect.anything()
    );

    render(<ListPage />, {
      providerOptions: nameFilterOptions,
      initialEntries: ['/?filters[$and]=abc'],
    });

    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: undefined }),
      expect.anything()
    );
  });

  it('sends a plugin date filter as the bounds of its day', async () => {
    render(<ListPage />, {
      providerOptions: {
        runHookWaterfall: settingsListHooks({
          after: 'description',
          column: { name: 'available-in', label: 'Available in' },
          filter: DATE_FILTER,
        }),
      },
      initialEntries: ['/?filters[$and][0][reviewedAt][$eq]=2023-10-31'],
    });

    await screen.findByText('Super Admin');
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: {
          $and: [
            {
              reviewedAt: {
                $gte: encodeURIComponent(DAY_BOUNDS.$gte),
                $lt: encodeURIComponent(DAY_BOUNDS.$lt),
              },
            },
          ],
        },
      }),
      expect.anything()
    );
  });

  it('ignores the filters of the URL when no plugin adds a popover filter', async () => {
    render(<ListPage />, {
      providerOptions,
      initialEntries: ['/?filters[$and][0][name][$eq]=Editor'],
    });

    await screen.findByText('Super Admin');
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: undefined }),
      expect.anything()
    );
  });

  it('sends the search alone as before when no popover filter is set', async () => {
    render(<ListPage />, { providerOptions, initialEntries: ['/?_q=edit'] });

    await screen.findByText('Super Admin');
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { name: { $containsi: 'edit' } } }),
      expect.anything()
    );
  });
});
