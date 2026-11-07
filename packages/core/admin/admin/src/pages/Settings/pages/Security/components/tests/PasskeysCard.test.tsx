import * as React from 'react';

import { render, screen } from '@tests/utils';

import { PasskeysCard } from '../PasskeysCard';

import type { PasskeySettings } from '../../../../../../../../shared/contracts/security-settings';

const ENABLED: PasskeySettings = { enabled: true };

const Harness = ({
  initial = ENABLED,
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof PasskeysCard>> & { initial?: PasskeySettings }) => {
  const [value, setValue] = React.useState(initial);
  return (
    <PasskeysCard
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      canUpdate
      {...props}
    />
  );
};

describe('PasskeysCard', () => {
  it('describes passkeys in one sentence and has no Save of its own', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Let users approve the second step of login with their device (Touch ID, Windows Hello, a security key or a phone) instead of typing a code.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Turning passkeys off deletes every registered passkey.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('reports the toggle', async () => {
    const onChange = jest.fn();
    const { user } = render(<Harness onChange={onChange} />);

    const allow = screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' });
    expect(allow).toBeChecked();
    await user.click(allow);

    expect(onChange).toHaveBeenLastCalledWith({ enabled: false });
    expect(allow).not.toBeChecked();
  });

  it('shows the save error it is given', () => {
    render(<Harness saveError="Refused" />);

    expect(screen.getByText('Refused')).toBeInTheDocument();
  });

  it('disables the toggle without the update permission', () => {
    render(<Harness canUpdate={false} />);

    expect(
      screen.getByRole('checkbox', { name: 'Allow users to log in with a passkey' })
    ).toBeDisabled();
  });
});
