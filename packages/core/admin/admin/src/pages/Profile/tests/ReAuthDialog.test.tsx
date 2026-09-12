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

  it('disables, shows the success toast, and closes', async () => {
    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'disable' });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

    expect(await screen.findByText('Two-factor authentication is disabled.')).toBeInTheDocument();
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

  it('trims surrounding whitespace off the code before sending it to regenerate recovery codes', async () => {
    let capturedBody: { password?: string; code?: string } | undefined;
    server.use(
      http.post('/admin/mfa/recovery-codes', async ({ request }) => {
        capturedBody = (await request.json()) as { password?: string; code?: string };
        return HttpResponse.json({ data: { recoveryCodes: CODES } });
      })
    );

    const { user } = renderDialog({ open: true, onClose: jest.fn(), intent: 'regenerate' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    // A pasted TOTP or recovery code commonly picks up a stray leading/trailing space.
    await user.type(screen.getByLabelText('Authentication code*'), ' 123456 ');
    await user.click(screen.getByRole('button', { name: 'Generate new recovery codes' }));

    await screen.findByText(CODES[0]);
    expect(capturedBody?.code).toBe('123456');
  });

  it('trims surrounding whitespace off the code before sending it to disable', async () => {
    let capturedBody: { password?: string; code?: string } | undefined;
    server.use(
      http.post('/admin/mfa/disable', async ({ request }) => {
        capturedBody = (await request.json()) as { password?: string; code?: string };
        return new HttpResponse(null, { status: 204 });
      })
    );

    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'disable' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), ' 123456 ');
    await user.click(screen.getByRole('button', { name: 'Disable two-factor authentication' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(capturedBody?.code).toBe('123456');
  });

  it('shows the acknowledge error and stays on the codes step when saving fails, then closes once it succeeds', async () => {
    const onClose = jest.fn();
    let shouldFail = true;
    server.use(
      http.post('/admin/mfa/recovery-codes/ack', () =>
        shouldFail
          ? HttpResponse.json(
              {
                error: {
                  status: 400,
                  name: 'ValidationError',
                  message: 'Could not save the acknowledgement',
                  details: {},
                },
              },
              { status: 400 }
            )
          : new HttpResponse(null, { status: 204 })
      )
    );

    const { user } = renderDialog({ open: true, onClose, intent: 'regenerate' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Generate new recovery codes' }));

    for (const code of CODES) expect(await screen.findByText(code)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    expect(await screen.findByText('Could not save the acknowledgement')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    for (const code of CODES) expect(screen.getByText(code)).toBeInTheDocument();

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
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

  it('submits once when Enter is pressed in the code field', async () => {
    // This form has two blocking fields (password and code) and, unlike EnrolDialog's
    // single-field forms, needs the submit button's `type="submit"` for Enter to do anything at
    // all -- see ReAuthDialog.tsx's comment on the HTML implicit-submission algorithm. Regression
    // test for that: before the fix, this Enter press submitted nothing.
    let disableRequestCount = 0;
    server.use(
      http.post('/admin/mfa/disable', async () => {
        disableRequestCount += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose, intent: 'disable' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(disableRequestCount).toBe(1);
  });

  it('does not post the disable request twice when the submit button is clicked twice while one is pending', async () => {
    // `fireEvent.click` dispatches a real `MouseEvent` (unlike `user.click`'s `PointerEvent`, see
    // EnrolDialog.tsx's comment on this suite's polyfill), so on this `type="submit"` button it
    // also reaches the form's native submit default action -- a single real click already fires
    // `handleSubmit` via both `onClick` and `onSubmit`. Clicking twice compounds that with a
    // genuine double-click, which is what the synchronous `inFlightRef` guard exists for (a
    // state-based `isLoading` guard is stale for calls this close together, see ReAuthDialog.tsx).
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
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');

    const submit = screen.getByRole('button', { name: 'Disable two-factor authentication' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(disableRequestCount).toBe(1);
  });
});
