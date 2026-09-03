import { render, server, screen, waitFor, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ReAuthDialog } from '../ReAuthDialog';

import { MfaStoreProbe, resetMfaStoreProbe, hasLeakedMfaSecrets } from './MfaStoreProbe';

const CODES = ['ABCDE12345', 'FGHJK67890'];

const gate = (path: string, ok: () => Response) =>
  http.post(path, async ({ request }) => {
    const body = (await request.json()) as { password?: string; code?: string };
    if (body.password !== 'Testing123!') {
      return HttpResponse.json(
        {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Invalid credentials',
            details: {},
          },
        },
        { status: 400 }
      );
    }
    if (body.code !== '123456') {
      return HttpResponse.json(
        { error: { status: 400, name: 'ValidationError', message: 'Invalid code', details: {} } },
        { status: 400 }
      );
    }
    return ok();
  });

/**
 * Renders `<ReAuthDialog>` alongside the shared store probe -- see `MfaStoreProbe.tsx` (and the
 * identical rationale on `EnrolDialog.test.tsx`) for why a test needs to inspect
 * `state.adminApi.mutations` directly rather than trusting local component state.
 */
const renderDialog = (props: Parameters<typeof ReAuthDialog>[0]) =>
  render(
    <>
      <MfaStoreProbe />
      <ReAuthDialog {...props} />
    </>
  );

describe('ReAuthDialog', () => {
  beforeEach(() => {
    resetMfaStoreProbe();
    server.use(
      gate('/admin/mfa/recovery-codes', () =>
        HttpResponse.json({ data: { recoveryCodes: CODES } })
      ),
      gate('/admin/mfa/disable', () => new HttpResponse(null, { status: 204 })),
      http.post('/admin/mfa/recovery-codes/ack', () => new HttpResponse(null, { status: 204 }))
    );
  });

  it('requires both the password and a code before submitting', async () => {
    const { user } = renderDialog({ open: true, onClose: jest.fn(), intent: 'disable' });

    const submit = screen.getByRole('button', { name: 'Disable two-factor authentication' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    expect(submit).toBeEnabled();
  });

  it('regenerates, shows the new codes once, and acknowledges', async () => {
    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'regenerate' });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Generate new recovery codes' }));

    for (const code of CODES) expect(await screen.findByText(code)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // the freshly issued recovery codes must not outlive the dialog in the Redux store (RTK
    // Query keeps a mutation's `data` around for as long as the hook stays subscribed, and this
    // dialog stays mounted for the whole profile-page session -- see ReAuthDialog.tsx).
    expect(hasLeakedMfaSecrets(...CODES)).toBe(false);
  });

  it('disables and closes on success', async () => {
    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'disable' });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows the server error and keeps the form on a wrong code', async () => {
    const { user } = renderDialog({ open: true, onClose: jest.fn(), intent: 'disable' });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '000000');
    await user.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

    expect(await screen.findByText('Invalid code')).toBeInTheDocument();
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
  });

  it('does not leak the recovery codes into the store when the dialog unmounts before acknowledging', async () => {
    // Simulates the whole page unmounting the dialog directly -- browser Back, or an app
    // redirect -- while it's open on the codes step, i.e. `close()` never runs at all. The
    // captured store outlives the unmounted component tree, so this reads it after `unmount()`.
    const { user, unmount } = renderDialog({
      open: true,
      onClose: jest.fn(),
      intent: 'regenerate',
    });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Generate new recovery codes' }));

    for (const code of CODES) expect(await screen.findByText(code)).toBeInTheDocument();

    unmount();

    expect(hasLeakedMfaSecrets(...CODES)).toBe(false);
  });

  it('does not post the disable request twice when Enter is pressed again while one is pending', async () => {
    let disableRequestCount = 0;
    server.use(
      http.post('/admin/mfa/disable', async () => {
        disableRequestCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new HttpResponse(null, { status: 204 });
      })
    );

    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'disable' });
    const passwordInput = screen.getByLabelText('Current password*');
    await user.type(passwordInput, 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    const form = passwordInput.closest('form');
    if (!form) {
      throw new Error('expected the password field to live inside a <form>');
    }

    // Simulates pressing Enter twice in a row: `fireEvent.submit` dispatches a real `submit`
    // event, which is how a real browser (not `user.click`, see EnrolDialog.tsx's comment on
    // this suite's `PointerEvent` polyfill) reacts to Enter in a text field.
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(disableRequestCount).toBe(1);
  });
});
