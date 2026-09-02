import { render, server, screen, waitFor, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useTypedStore } from '../../../core/store/hooks';
import { EnrolDialog } from '../EnrolDialog';

import type { RootState } from '../../../core/store/configure';

const SECRET = 'JBSWY3DPEHPK3PXP';
const URI = `otpauth://totp/Strapi:test%40testing.com?secret=${SECRET}&issuer=Strapi`;
const CODES = ['ABCDE12345', 'FGHJK67890'];

/**
 * Renders `<EnrolDialog>` alongside a probe that captures the real Redux store instance from the
 * same `Provider` tree, so a test can inspect `state.adminApi.mutations` directly -- this is how
 * we prove the secret/otpauth URI/recovery codes don't outlive the dialog in the store, not just
 * in local component state.
 */
let capturedStore: ReturnType<typeof useTypedStore> | undefined;

const StoreCapture = () => {
  capturedStore = useTypedStore();
  return null;
};

const renderDialog = (props: Parameters<typeof EnrolDialog>[0]) =>
  render(
    <>
      <StoreCapture />
      <EnrolDialog {...props} />
    </>
  );

/** True if any cached mutation result still carries the secret, the otpauth URI, or a code. */
const hasLeakedMfaSecrets = () => {
  const state = capturedStore!.getState() as RootState;
  return Object.values(state.adminApi.mutations).some((entry) => {
    if (!entry?.data) {
      return false;
    }
    const json = JSON.stringify(entry.data);
    return json.includes(SECRET) || json.includes(URI) || CODES.some((code) => json.includes(code));
  });
};

describe('EnrolDialog', () => {
  beforeEach(() => {
    capturedStore = undefined;
    server.use(
      http.post('/admin/mfa/enrol', async ({ request }) => {
        const body = (await request.json()) as { password?: string };
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
        return HttpResponse.json({ data: { secret: SECRET, otpauthUri: URI } });
      }),
      http.post('/admin/mfa/enrol/verify', async ({ request }) => {
        const body = (await request.json()) as { code?: string };
        if (body.code !== '123456') {
          return HttpResponse.json(
            {
              error: { status: 400, name: 'ValidationError', message: 'Invalid code', details: {} },
            },
            { status: 400 }
          );
        }
        return HttpResponse.json({ data: { recoveryCodes: CODES } });
      }),
      http.post('/admin/mfa/recovery-codes/ack', () => new HttpResponse(null, { status: 204 }))
    );
  });

  it('walks password, scan, verify, recovery codes, acknowledge', async () => {
    const onClose = jest.fn();
    const { user } = renderDialog({ open: true, onClose });

    expect(
      screen.getByRole('dialog', { name: 'Enable two-factor authentication' })
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // step 2: the QR code and the manual key, never the raw URI as plain text or in an attribute
    expect(await screen.findByRole('img', { name: /scan this qr code/i })).toBeInTheDocument();
    expect(screen.getByText(SECRET)).toBeInTheDocument();
    expect(screen.queryByText(URI)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(URI);

    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // step 3: codes shown once, acknowledgement mandatory
    CODES.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'I have saved my recovery codes' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // the secret, otpauth URI and recovery codes must not outlive the dialog in the Redux store
    // (RTK Query keeps a mutation's `data` around for as long as the hook stays subscribed, and
    // this dialog stays mounted for the whole profile-page session -- see EnrolDialog.tsx).
    expect(hasLeakedMfaSecrets()).toBe(false);
  });

  it('shows the credentials error on a wrong password and stays on step 1', async () => {
    const { user } = renderDialog({ open: true, onClose: jest.fn() });

    await user.type(screen.getByLabelText('Current password*'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
  });

  it('shows the generic error on a wrong code and stays on the scan step with the same secret', async () => {
    const { user } = renderDialog({ open: true, onClose: jest.fn() });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Authentication code*'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Invalid code')).toBeInTheDocument();
    expect(screen.getByText(SECRET)).toBeInTheDocument();
  });

  it('does not post the verify request twice when Enter is pressed again while one is pending', async () => {
    let verifyRequestCount = 0;
    server.use(
      http.post('/admin/mfa/enrol/verify', async () => {
        verifyRequestCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ data: { recoveryCodes: CODES } });
      })
    );

    const { user } = renderDialog({ open: true, onClose: jest.fn() });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const codeInput = await screen.findByLabelText('Authentication code*');
    await user.type(codeInput, '123456');
    const form = codeInput.closest('form');
    if (!form) {
      throw new Error('expected the code field to live inside a <form>');
    }

    // Simulates pressing Enter twice in a row: `fireEvent.submit` dispatches a real `submit`
    // event, which is how a real browser (not `user.click`, see EnrolDialog.tsx's comment on
    // this suite's `PointerEvent` polyfill) reacts to Enter in a text field.
    fireEvent.submit(form);
    fireEvent.submit(form);

    await screen.findByRole('checkbox');
    expect(verifyRequestCount).toBe(1);
  });

  it('ignores an Enter-key submit while the code is too short to pass the button gate', async () => {
    let verifyRequestCount = 0;
    server.use(
      http.post('/admin/mfa/enrol/verify', async () => {
        verifyRequestCount += 1;
        return HttpResponse.json({ data: { recoveryCodes: CODES } });
      })
    );

    const { user } = renderDialog({ open: true, onClose: jest.fn() });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const codeInput = await screen.findByLabelText('Authentication code*');
    await user.type(codeInput, '123');
    const form = codeInput.closest('form');
    if (!form) {
      throw new Error('expected the code field to live inside a <form>');
    }

    fireEvent.submit(form);

    // Give a wrongly-unguarded handler time to actually reach the mocked network layer before
    // asserting it never did -- `fireEvent.submit` only flushes the synchronous part of the
    // (async) handler, so asserting immediately would pass trivially regardless of the guard.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(verifyRequestCount).toBe(0);
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
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
                  status: 500,
                  name: 'InternalError',
                  message: 'Something went wrong',
                  details: {},
                },
              },
              { status: 500 }
            )
          : new HttpResponse(null, { status: 204 })
      )
    );

    const { user } = renderDialog({ open: true, onClose });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Authentication code*'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    CODES.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument());

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'I have saved my recovery codes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('forgets the secret when closed before finishing', async () => {
    const onClose = jest.fn();
    const { user, rerender } = renderDialog({ open: true, onClose });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText(SECRET);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(hasLeakedMfaSecrets()).toBe(false);

    // `<EnrolDialog>` is mounted for the whole profile-page session in production (see
    // TwoFactorSection.tsx) -- only its `open` prop toggles -- so re-opening it here means
    // toggling `open` on the *same* instance, not remounting a fresh one (a fresh instance would
    // trivially start clean regardless of whether `reset()` actually clears anything).
    rerender(
      <>
        <StoreCapture />
        <EnrolDialog open={false} onClose={onClose} />
      </>
    );
    rerender(
      <>
        <StoreCapture />
        <EnrolDialog open onClose={onClose} />
      </>
    );
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });
});
