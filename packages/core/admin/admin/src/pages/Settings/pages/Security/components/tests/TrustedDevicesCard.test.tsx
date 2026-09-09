import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { TrustedDevicesCard } from '../TrustedDevicesCard';

import type { TrustedDeviceSettings } from '../../../../../../../../shared/contracts/security-settings';

const SETTINGS: TrustedDeviceSettings = { enabled: true, days: 30 };

const renderCard = (props: Partial<React.ComponentProps<typeof TrustedDevicesCard>> = {}) =>
  render(<TrustedDevicesCard settings={SETTINGS} canUpdate callerEnrolled={false} {...props} />);

/** Captures the PUT body and answers with the whole document the server would return. */
const captureSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/admin/security-settings', async ({ request }) => {
      const body = (await request.json()) as { trustedDevices: TrustedDeviceSettings };
      bodies.push(body);
      return HttpResponse.json({
        data: {
          mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
          trustedDevices: body.trustedDevices,
        },
      });
    })
  );
  return bodies;
};

const enabledBox = () =>
  screen.getByRole('checkbox', { name: 'Allow users to trust a device after entering a code' });
const daysField = () => screen.getByRole('spinbutton', { name: 'Trust period (days)' });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('TrustedDevicesCard', () => {
  it('renders the stored policy with Save disabled', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Trusted devices' })).toBeInTheDocument();
    expect(enabledBox()).toBeChecked();
    expect(daysField()).toHaveValue(30);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables every control and Save without the update permission', () => {
    renderCard({ canUpdate: false });

    expect(enabledBox()).toBeDisabled();
    expect(daysField()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables the period while trust is off', () => {
    renderCard({ settings: { enabled: false, days: 30 } });

    expect(enabledBox()).not.toBeChecked();
    expect(daysField()).toBeDisabled();
  });

  it('shortening the period saves directly, sending only the trustedDevices object', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    await user.clear(daysField());
    await user.type(daysField(), '7');
    save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ trustedDevices: { enabled: true, days: 7 } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('disabling saves directly', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    await user.click(enabledBox());
    save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ trustedDevices: { enabled: false, days: 30 } });
  });

  it('lengthening the period asks for the password alone when the caller is not enrolled', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ callerEnrolled: false });

    await user.clear(daysField());
    await user.type(daysField(), '60');
    save();

    const dialog = await screen.findByRole('dialog', {
      name: 'Confirm lowering two-factor requirements',
    });
    expect(bodies).toHaveLength(0);
    expect(dialog).not.toHaveTextContent('Authentication code');
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      trustedDevices: { enabled: true, days: 60 },
      password: 'Testing123!',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('enabling asks for the password and a code when the caller is enrolled', async () => {
    const bodies = captureSave();
    const { user } = renderCard({ settings: { enabled: false, days: 30 }, callerEnrolled: true });

    await user.click(enabledBox());
    save();

    await screen.findByRole('dialog', { name: 'Confirm lowering two-factor requirements' });
    await user.type(screen.getByLabelText('Current password*'), 'Testing123!');
    await user.type(screen.getByLabelText('Authentication code*'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      trustedDevices: { enabled: true, days: 30 },
      password: 'Testing123!',
      code: '123456',
    });
  });

  it('rejects a period outside 1..90 inline and sends nothing', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    await user.clear(daysField());
    await user.type(daysField(), '91');
    save();

    expect(
      await screen.findByText('Enter a whole number of days between 1 and 90')
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('unticking resets an invalid period back to the stored value so it cannot block saving enabled: false', async () => {
    const bodies = captureSave();
    const { user } = renderCard();

    await user.clear(daysField());
    await user.type(daysField(), '91');
    await user.click(enabledBox());
    save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ trustedDevices: { enabled: false, days: 30 } });
    expect(
      screen.queryByText('Enter a whole number of days between 1 and 90')
    ).not.toBeInTheDocument();
  });

  it('shows a server refusal inline', async () => {
    server.use(
      http.put('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 400, name: 'ValidationError', message: 'Nope', details: {} } },
          { status: 400 }
        )
      )
    );
    const { user } = renderCard();

    await user.clear(daysField());
    await user.type(daysField(), '7');
    save();

    expect(await screen.findByText('Nope')).toBeInTheDocument();
  });
});
