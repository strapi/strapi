import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ListPageCE } from '../ListPage';

// Expose the Status variant so the tests can check the colour the badge carries, not just its text.
jest.mock('@strapi/design-system', () => {
  const actual = jest.requireActual('@strapi/design-system');
  return {
    ...actual,
    Status: ({ variant, children }: { variant: string; children: React.ReactNode }) => (
      <div data-testid="status" data-variant={variant}>
        {children}
      </div>
    ),
  };
});

/** The variant of the one Status badge in this cell or row. */
const variantOf = (container: HTMLElement) =>
  within(container).getByTestId('status').getAttribute('data-variant');

describe('Users | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { findByText } = render(<ListPageCE />);

    await findByText('John');
    await findByText('Kai');
  });

  it('has no two-factor column when the rows carry no enforcement state', async () => {
    render(<ListPageCE />);

    await screen.findByText('John');
    expect(screen.queryByText('Two-factor')).not.toBeInTheDocument();
    expect(screen.getByText('User status')).toBeInTheDocument();
  });

  describe('with the two-factor feature on', () => {
    const originalFuture = window.strapi.future;

    beforeEach(() => {
      window.strapi.future = { isEnabled: (name) => name === 'unstableAdminMfa' };
    });

    afterEach(() => {
      window.strapi.future = originalFuture;
    });

    const day = 24 * 60 * 60 * 1000;
    const row = (id: number, lastname: string, extra: Record<string, unknown>) => ({
      id,
      firstname: 'U',
      lastname,
      roles: [],
      isActive: true,
      mfaEnabledAt: null,
      mfaGraceUntil: null,
      mfaLockedAt: null,
      ...extra,
    });
    const rowsOf = (...rows: unknown[]) =>
      server.use(
        http.get('/admin/users', () =>
          HttpResponse.json({ data: { results: rows, pagination: { page: 1 } } })
        )
      );
    /** The cells of the row for a last name: [user status, two-factor]. */
    const cellsOf = async (lastname: string) => {
      const row = await screen.findByRole('row', { name: new RegExp(lastname) });
      const cells = within(row).getAllByRole('gridcell');
      return { status: cells[cells.length - 3], twoFactor: cells[cells.length - 2] };
    };

    it('shows only Enabled or Not set up in the two-factor column, never Locked', async () => {
      rowsOf(
        row(1, 'Enrolled', { mfaEnabledAt: '2026-09-01T10:00:00.000Z' }),
        row(2, 'Lockee', { mfaLockedAt: '2026-09-12T10:00:00.000Z' }),
        row(3, 'Never', {})
      );
      render(<ListPageCE />);

      expect(await screen.findByText('Two-factor')).toBeInTheDocument();
      // Next to the two-factor column the status column is a plain "Status".
      expect(screen.getByText('Status', { selector: 'th *' })).toBeInTheDocument();
      expect(screen.queryByText('User status')).not.toBeInTheDocument();
      expect((await cellsOf('Enrolled')).twoFactor).toHaveTextContent('Enabled');
      const locked = await cellsOf('Lockee');
      expect(locked.twoFactor).toHaveTextContent('Not set up');
      expect(locked.twoFactor).not.toHaveTextContent('Locked');
      expect((await cellsOf('Never')).twoFactor).toHaveTextContent('Not set up');
    });

    it('gives the user status Active, Inactive or Locked, Inactive taking precedence', async () => {
      rowsOf(
        row(1, 'Alpha', {}),
        row(2, 'Beta', { isActive: false }),
        row(3, 'Lockee', { mfaLockedAt: '2026-09-12T10:00:00.000Z' }),
        row(4, 'Both', { isActive: false, mfaLockedAt: '2026-09-12T10:00:00.000Z' })
      );
      render(<ListPageCE />);

      const alpha = (await cellsOf('Alpha')).status;
      expect(alpha).toHaveTextContent('Active');
      expect(variantOf(alpha)).toBe('success');
      const beta = (await cellsOf('Beta')).status;
      expect(beta).toHaveTextContent('Inactive');
      expect(variantOf(beta)).toBe('neutral');
      const lockee = (await cellsOf('Lockee')).status;
      expect(lockee).toHaveTextContent('Locked');
      expect(variantOf(lockee)).toBe('danger');
      // An inactive account cannot log in at all, so unlocking it would not help: Inactive wins.
      const both = (await cellsOf('Both')).status;
      expect(both).toHaveTextContent('Inactive');
      expect(both).not.toHaveTextContent('Locked');
    });

    it('words the requirement under the state', async () => {
      rowsOf(
        row(1, 'Enrolled', { mfaEnabledAt: '2026-09-01T10:00:00.000Z', mfaRequired: true }),
        row(2, 'NotRequired', { mfaRequired: false }),
        row(3, 'NextLogin', { mfaRequired: true }),
        row(4, 'FiveDays', {
          mfaRequired: true,
          mfaGraceUntil: new Date(Date.now() + 4.5 * day).toISOString(),
        }),
        row(5, 'OneDay', {
          mfaRequired: true,
          mfaGraceUntil: new Date(Date.now() + 0.5 * day).toISOString(),
        }),
        row(6, 'Lockee', { mfaRequired: true, mfaLockedAt: '2026-09-12T10:00:00.000Z' })
      );
      render(<ListPageCE />);

      expect((await cellsOf('Enrolled')).twoFactor).not.toHaveTextContent('Required');
      expect((await cellsOf('NotRequired')).twoFactor).not.toHaveTextContent('Required');
      expect((await cellsOf('NextLogin')).twoFactor).toHaveTextContent('Required from next login');
      expect((await cellsOf('FiveDays')).twoFactor).toHaveTextContent('Required, 5 days left');
      expect((await cellsOf('OneDay')).twoFactor).toHaveTextContent('Required, 1 day left');
      expect((await cellsOf('Lockee')).twoFactor).toHaveTextContent(/Not set upRequired$/);
    });
  });

  it('shows the user status exactly as before when the feature is off', async () => {
    server.use(
      http.get('/admin/users', () =>
        HttpResponse.json({
          data: {
            results: [
              {
                id: 1,
                firstname: 'U',
                lastname: 'Lockee',
                roles: [],
                isActive: true,
                // Only a stale lock: the server sends nothing else with the feature off.
                mfaLockedAt: '2026-09-12T10:00:00.000Z',
              },
              {
                id: 2,
                firstname: 'U',
                lastname: 'Dormant',
                roles: [],
                isActive: false,
              },
            ],
            pagination: { page: 1 },
          },
        })
      )
    );
    render(<ListPageCE />);

    const row = await screen.findByRole('row', { name: /Lockee/ });
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(variantOf(row)).toBe('success');
    expect(within(row).queryByText('Locked')).not.toBeInTheDocument();
    // Inactive keeps its red badge with the feature off.
    const dormant = await screen.findByRole('row', { name: /Dormant/ });
    expect(variantOf(dormant)).toBe('danger');
  });
});
