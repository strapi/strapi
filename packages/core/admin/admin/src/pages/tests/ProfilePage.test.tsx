import { render, server } from '@tests/utils';
import { rest } from 'msw';

import { ProfilePage } from '../ProfilePage';

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
});
