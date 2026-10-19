import { render, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ProfilePage } from '../ProfilePage';

const MFA_STATUS = {
  enabled: false,
  enabledAt: null,
  recoveryCodesRemaining: 0,
  codesAcknowledged: false,
  required: false,
  graceUntil: null,
  trustedDevicesEnabled: false,
  passkeysEnabled: false,
  hasLocalPassword: true,
};

describe('Profile page', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeAll(() => {
    window.strapi.isEE = true;
    window.strapi.features.isEnabled = () => true;

    window.localStorage.setItem('jwtToken', JSON.stringify('token'));
  });

  afterAll(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and shows the Interface Language section', async () => {
    const { findByText } = render(<ProfilePage />);

    await findByText('Interface language');
  });

  it('should display username if it exists', async () => {
    const { getByText, findByText } = render(<ProfilePage />);
    await findByText('Interface language');

    expect(getByText('yolo')).toBeInTheDocument();
  });

  it('should display the change password section and all its fields', async () => {
    const { getByRole, getByLabelText, findByText } = render(<ProfilePage />);

    await findByText('Interface language');

    expect(
      getByRole('heading', {
        name: 'Change password',
      })
    ).toBeInTheDocument();
    expect(getByLabelText(/current password/i)).toBeInTheDocument();
    expect(getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('should not display the change password section and all the fields if the user role is Locked', async () => {
    server.use(
      http.get('/admin/providers/isSSOLocked', () => {
        return HttpResponse.json({
          data: {
            isSSOLocked: true,
          },
        });
      })
    );

    const { queryByRole, findByText, queryByLabelText } = render(<ProfilePage />);

    const changePasswordHeading = queryByRole('heading', {
      name: 'Change password',
    });

    await findByText('Interface language');

    expect(changePasswordHeading).not.toBeInTheDocument();
    expect(queryByLabelText(/current password/i)).not.toBeInTheDocument();
    expect(queryByLabelText(/^password$/)).not.toBeInTheDocument();
    expect(queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
  });

  it('should display the two-factor authentication section when the status endpoint is available', async () => {
    server.use(http.get('/admin/mfa/me', () => HttpResponse.json({ data: MFA_STATUS })));

    const { findByText, findByRole } = render(<ProfilePage />);

    await findByText('Interface language');

    expect(await findByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
  });

  it('should not display the two-factor authentication section if the user role is Locked', async () => {
    // The status endpoint answers, so the section *would* render. Without this the default handler
    // 404s, the section is absent for that reason alone, and the test passed with the Locked check
    // deleted.
    let statusRequested = false;
    server.use(
      http.get('/admin/providers/isSSOLocked', () => {
        return HttpResponse.json({
          data: {
            isSSOLocked: true,
          },
        });
      }),
      http.get('/admin/mfa/me', () => {
        statusRequested = true;
        return HttpResponse.json({ data: MFA_STATUS });
      })
    );

    const { queryByRole, findByText } = render(<ProfilePage />);

    await findByText('Interface language');

    expect(queryByRole('heading', { name: 'Two-factor authentication' })).not.toBeInTheDocument();
    expect(statusRequested).toBe(false);
  });
});
