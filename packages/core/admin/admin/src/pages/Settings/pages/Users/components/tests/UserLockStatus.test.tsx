import { within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { UserLockStatus } from '../UserLockStatus';

const renderLock = (props: Partial<React.ComponentProps<typeof UserLockStatus>> = {}) =>
  render(<UserLockStatus userId={3} lockedAt="2026-02-01T00:00:00.000Z" canUpdate {...props} />);

const confirmWithCredentials = async (user: ReturnType<typeof renderLock>['user']) => {
  const dialog = await screen.findByRole('alertdialog');
  const password = within(dialog).queryByLabelText(/Current password/);
  if (password) await user.type(password, 'Password123');
  const code = within(dialog).queryByLabelText(/Authentication code/);
  if (code) await user.type(code, '123456');
  await user.click(within(dialog).getByRole('button', { name: 'Unlock' }));
};

describe('UserLockStatus', () => {
  it('shows a Locked badge, since when, and the single sign-on caveat', async () => {
    renderLock();

    expect(await screen.findByText('Locked')).toBeInTheDocument();
    expect(screen.getByText(/^Locked for password login since/)).toBeInTheDocument();
    expect(screen.getByText(/Single sign-on logins are not affected/)).toBeInTheDocument();
  });

  it('confirms, unlocks the account, says so and tells the page', async () => {
    const calls: string[] = [];
    const onUnlocked = jest.fn();
    server.use(
      http.post('/admin/mfa/users/:id/unlock', ({ params }) => {
        calls.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = renderLock({ onUnlocked });

    await user.click(await screen.findByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText('Unlock this account?')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await confirmWithCredentials(user);

    await waitFor(() => expect(calls).toEqual(['3']));
    expect(await screen.findByText('Account unlocked.')).toBeInTheDocument();
    expect(onUnlocked).toHaveBeenCalled();
  });

  it('says why an unlock failed', async () => {
    const onUnlocked = jest.fn();
    server.use(
      http.post('/admin/mfa/users/:id/unlock', () =>
        HttpResponse.json(
          {
            error: {
              status: 500,
              name: 'InternalServerError',
              message: 'Unlock refused',
              details: {},
            },
          },
          { status: 500 }
        )
      )
    );
    const { user } = renderLock({ onUnlocked });

    await user.click(await screen.findByRole('button', { name: 'Unlock' }));
    await confirmWithCredentials(user);

    expect(await screen.findByText('Unlock refused')).toBeInTheDocument();
    expect(screen.queryByText('Account unlocked.')).not.toBeInTheDocument();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('shows the lock read-only, with no Unlock, without the update permission', async () => {
    renderLock({ canUpdate: false });

    expect(await screen.findByText('Locked')).toBeInTheDocument();
    expect(screen.getByText(/^Locked for password login since/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
  });
});
