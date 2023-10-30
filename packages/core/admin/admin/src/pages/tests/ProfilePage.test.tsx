import { render, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import { ProfilePage } from '../ProfilePage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFocusWhenNavigate: jest.fn(),
  useAppInfo: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
}));

describe('Profile page', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeAll(() => {
    window.strapi.isEE = true;
    window.strapi.features.isEnabled = () => true;
  });

  afterAll(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and show the Interface Language section', async () => {
    const { getByText } = render(<ProfilePage />);
    await waitFor(() => {
      expect(getByText('Interface language')).toBeInTheDocument();
    });
  });

  it('should display username if it exists', async () => {
    const { getByText } = render(<ProfilePage />);
    await waitFor(() => {
      expect(getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should display the change password section and all its fields', async () => {
    const { getByRole, queryByTestId, getByLabelText } = render(<ProfilePage />);

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(
      getByRole('heading', {
        name: 'Change password',
      })
    ).toBeInTheDocument();

    expect(getByLabelText('Password')).toBeInTheDocument();

    expect(getByLabelText('Password confirmation')).toBeInTheDocument();
  });

  it('should not display the change password section and all the fields if the user role is Locked', async () => {
    server.use(
      rest.get('/admin/providers/isSSOLocked', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: {
              isSSOLocked: true,
            },
          })
        );
      })
    );

    const { queryByRole, queryByTestId, queryByLabelText } = render(<ProfilePage />);

    const changePasswordHeading = queryByRole('heading', {
      name: 'Change password',
    });

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(changePasswordHeading).not.toBeInTheDocument();

    expect(queryByLabelText('Password')).not.toBeInTheDocument();

    expect(queryByLabelText('Password confirmation')).not.toBeInTheDocument();
  });
});
