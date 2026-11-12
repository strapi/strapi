import * as React from 'react';

import { render, screen } from '@tests/utils';

import { TrustedDevicesCard, type TrustedDevicesDraft } from '../TrustedDevicesCard';

const DRAFT: TrustedDevicesDraft = { enabled: true, days: 30 };

/** The card is controlled; this keeps its value in state so interactions read back. */
const Harness = ({
  initial = DRAFT,
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof TrustedDevicesCard>> & {
  initial?: TrustedDevicesDraft;
}) => {
  const [value, setValue] = React.useState(initial);
  return (
    <TrustedDevicesCard
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

describe('TrustedDevicesCard', () => {
  it('renders the setting with a one-sentence hint and no Save of its own', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Trusted devices' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Allow users to trust a device after entering a code' })
    ).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Trust period (days)' })).toHaveValue(30);
    expect(screen.getByText('How long a trusted browser can skip the code.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('reports a change to the period, and an emptied field as null', async () => {
    const onChange = jest.fn();
    const { user } = render(<Harness onChange={onChange} />);

    const days = screen.getByRole('spinbutton', { name: 'Trust period (days)' });
    await user.clear(days);
    expect(onChange).toHaveBeenLastCalledWith({ enabled: true, days: null });
    await user.type(days, '7');
    expect(onChange).toHaveBeenLastCalledWith({ enabled: true, days: 7 });
  });

  it('disables the period while trust is off', () => {
    render(<Harness initial={{ enabled: false, days: 30 }} />);

    expect(screen.getByRole('spinbutton', { name: 'Trust period (days)' })).toBeDisabled();
  });

  it('shows the errors it is given', () => {
    render(<Harness daysError="Enter a whole number of days between 1 and 90" saveError="No" />);

    expect(screen.getByText('Enter a whole number of days between 1 and 90')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('disables every control without the update permission', () => {
    render(<Harness canUpdate={false} />);

    expect(
      screen.getByRole('checkbox', { name: 'Allow users to trust a device after entering a code' })
    ).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Trust period (days)' })).toBeDisabled();
  });
});
