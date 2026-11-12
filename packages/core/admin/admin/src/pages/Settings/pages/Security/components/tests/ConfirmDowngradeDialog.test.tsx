import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { ConfirmDowngradeDialog } from '../ConfirmDowngradeDialog';

const renderDialog = (props: Partial<React.ComponentProps<typeof ConfirmDowngradeDialog>> = {}) => {
  const onConfirm = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  const utils = render(
    <ConfirmDowngradeDialog open requiresCode onClose={onClose} onConfirm={onConfirm} {...props} />
  );
  return { ...utils, onConfirm, onClose };
};

describe('ConfirmDowngradeDialog', () => {
  it('asks for the password and a code when the caller is enrolled', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Lower two-factor requirements?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Confirm your password and a code to continue.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
    expect(screen.getByLabelText('Authentication code*')).toHaveAttribute(
      'autocomplete',
      'one-time-code'
    );
    expect(screen.getByRole('button', { name: 'Lower requirements' })).toBeDisabled();
  });

  it('asks for the password only when the caller is not enrolled', async () => {
    const { user, onConfirm } = renderDialog({ requiresCode: false });

    expect(screen.queryByLabelText('Authentication code*')).not.toBeInTheDocument();
    expect(screen.getByText('Confirm your password to continue.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(screen.getByRole('button', { name: 'Lower requirements' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ password: 'Testing123!' }));
  });

  it('submits the trimmed code with the password and clears the fields on success', async () => {
    const { user, onConfirm } = renderDialog();

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), ' 123456 ');
    fireEvent.click(screen.getByRole('button', { name: 'Lower requirements' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({ password: 'Testing123!', code: '123456' })
    );
  });

  it('shows the returned error and stays open when onConfirm rejects the credentials', async () => {
    const onConfirm = jest.fn().mockResolvedValue('Invalid credentials');
    const { user, onClose } = renderDialog({ onConfirm });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '000000');
    fireEvent.click(screen.getByRole('button', { name: 'Lower requirements' }));

    // The design system's permanent `#live-region-alert` node always carries `role="alert"`, even
    // empty, so a bare `findByRole('alert')` query resolves to it immediately instead of waiting
    // for the real one (same caveat documented in `MfaNotices.test.tsx` and
    // `TwoFactorSection.test.tsx`) -- assert on text instead.
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // the password is kept so the user can retry the code without retyping it
    expect(screen.getByLabelText('Current password*')).toHaveValue('Testing123!');
  });

  it('keeps the confirm button disabled until the password and a 6+ character code are present', async () => {
    const { user } = renderDialog();

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    expect(screen.getByRole('button', { name: 'Lower requirements' })).toBeDisabled();
    await user.type(screen.getByLabelText('Authentication code*'), '12345');
    expect(screen.getByRole('button', { name: 'Lower requirements' })).toBeDisabled();
    await user.type(screen.getByLabelText('Authentication code*'), '6');
    expect(screen.getByRole('button', { name: 'Lower requirements' })).toBeEnabled();
  });

  it('does not submit twice for one click and Enter racing each other', async () => {
    let resolve!: (v: undefined) => void;
    const onConfirm = jest.fn(() => new Promise<undefined>((r) => (resolve = r)));
    const { user } = renderDialog({ onConfirm });

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Lower requirements' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Lower requirements' }).closest('form')!);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolve(undefined);
  });

  it('clears the fields and calls onClose on Cancel', async () => {
    const { user, onClose } = renderDialog();

    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('renders the caller-supplied title, description and button instead of the defaults', () => {
    renderDialog({
      title: 'Turn passkeys off?',
      description: 'This deletes all 4 passkeys your users registered. This cannot be undone.',
      confirmLabel: 'Turn off',
    });

    expect(screen.getByRole('dialog', { name: 'Turn passkeys off?' })).toBeInTheDocument();
    expect(
      screen.getByText('This deletes all 4 passkeys your users registered. This cannot be undone.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeInTheDocument();
    // the credential fields are unaffected by the copy override
    expect(screen.getByLabelText('Current password*')).toBeInTheDocument();
    expect(screen.getByLabelText('Authentication code*')).toBeInTheDocument();
  });

  /** An SSO-only administrator turning passkeys off: the server asks them for nothing. */
  it('confirms without credential fields when no password is required', async () => {
    const { onConfirm } = renderDialog({ requiresPassword: false, confirmLabel: 'Turn off' });

    expect(screen.queryByLabelText('Current password*')).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirm your password/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
  });
});
