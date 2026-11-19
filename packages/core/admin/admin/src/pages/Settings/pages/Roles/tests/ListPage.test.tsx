import { render, screen } from '@tests/utils';

import { settingsListHooks, SPACE_FILTER } from '../../../../../../tests/settingsListHooks';
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

  it('shows the plugin filter in the filter bar and sends it apart with the roles request', async () => {
    render(<ListPage />, {
      providerOptions,
      initialEntries: ['/?filters[$and][0][plugin::spaces.space][$eq]=france'],
    });

    expect(await screen.findByText('Space $eq france')).toBeInTheDocument();
    expect(useAdminRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({
        plugins: { spaces: { $and: [{ space: { $eq: 'france' } }] } },
      }),
      expect.anything()
    );
  });
});
