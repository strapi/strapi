import { fireEvent } from '@testing-library/react';
import { render, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Login } from '../Login';

const FIELD_LABELS = ['Email', 'Password', 'Remember me'];

const LocationProbe = () => {
  const { pathname, search, state } = useLocation();
  return <pre>{JSON.stringify({ pathname, search, state })}</pre>;
};

describe('ResetPassword', () => {
  it('renders correctly', () => {
    const { getByText, getByRole, getByLabelText } = render(<Login />);

    expect(getByRole('heading', { name: 'Welcome!' })).toBeInTheDocument();
    expect(getByText('Log in to your Strapi account')).toBeInTheDocument();

    FIELD_LABELS.forEach((label) => {
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeInTheDocument();
    });

    expect(getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Forgot your password?' })).toBeInTheDocument();
  });

  describe('validation', () => {
    it('shoudl fail if we dont fill in any field', async () => {
      const { getByRole, findAllByText } = render(<Login />);

      fireEvent.click(getByRole('button', { name: 'Login' }));

      expect(await findAllByText('This value is required.')).toHaveLength(2);
    });

    it('should fail if we dont fill in a password', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<Login />);

      await user.type(getByLabelText('Email*'), 'test@testing.com');

      fireEvent.click(getByRole('button', { name: 'Login' }));

      expect(await findByText('This value is required.')).toBeInTheDocument();
    });

    it('should fail if we dont fill in an email', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<Login />);

      await user.type(getByLabelText('Password*'), 'Testing123!');

      fireEvent.click(getByRole('button', { name: 'Login' }));

      expect(await findByText('This value is required.')).toBeInTheDocument();
    });
  });

  describe('second factor', () => {
    it('sends the user to /auth/mfa with the challenge in router state when login answers mfaRequired', async () => {
      server.use(
        http.post('/admin/login', () =>
          HttpResponse.json({
            data: { mfaRequired: true, challengeToken: 'a'.repeat(64), expiresIn: 300 },
          })
        )
      );

      const { getByRole, getByLabelText, user, findByText } = render(
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/mfa" element={<LocationProbe />} />
        </Routes>,
        { initialEntries: ['/auth/login?redirectTo=%2Fcontent-manager'] }
      );

      await user.type(getByLabelText('Email*'), 'test@testing.com');
      await user.type(getByLabelText('Password*'), 'Testing123!');
      await user.click(getByLabelText('Remember me'));
      // `user.click` on a submit button relies on `HTMLFormElement.requestSubmit`, which jsdom
      // doesn't implement, so it never fires the form's submit handler here. `fireEvent.click`
      // (used for every other submit in this file) dispatches the click directly and works.
      fireEvent.click(getByRole('button', { name: 'Login' }));

      // the probe prints JSON.stringify({ pathname, search, state })
      expect(await findByText(/"pathname":"\/auth\/mfa"/)).toBeInTheDocument();
      expect(await findByText(/"search":"\?redirectTo=%2Fcontent-manager"/)).toBeInTheDocument();
      expect(await findByText(/"rememberMe":true/)).toBeInTheDocument();
      expect(await findByText(/"expiresIn":300/)).toBeInTheDocument();
      // the token is in state, not anywhere persistent
      expect(window.localStorage.getItem('jwtToken')).toBeNull();
    });

    it('shows the locked-account message when login answers 403 MfaLockedError', async () => {
      server.use(
        http.post('/admin/login', () =>
          HttpResponse.json(
            {
              error: {
                status: 403,
                name: 'MfaLockedError',
                message:
                  'Two-factor authentication was not set up in time; this account is locked.',
                details: {},
              },
            },
            { status: 403 }
          )
        )
      );

      const { getByRole, getByLabelText, user, findByText } = render(<Login />);

      await user.type(getByLabelText('Email*'), 'test@testing.com');
      await user.type(getByLabelText('Password*'), 'Testing123!');
      fireEvent.click(getByRole('button', { name: 'Login' }));

      // The design system keeps a permanent, empty `role="alert"` live region mounted for toast
      // announcements, so `findByRole('alert')` resolves against that instead of waiting for this
      // banner (see MfaChallenge.test.tsx for the same workaround). Wait on the actual text, then
      // confirm it is the alert-role element.
      const errorMessage = await findByText(
        'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.'
      );
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(window.localStorage.getItem('jwtToken')).toBeNull();
    });

    it('still shows the server message for other login errors', async () => {
      server.use(
        http.post('/admin/login', () =>
          HttpResponse.json(
            {
              error: {
                status: 400,
                name: 'ApplicationError',
                message: 'Invalid credentials',
                details: {},
              },
            },
            { status: 400 }
          )
        )
      );

      const { getByRole, getByLabelText, user, findByText } = render(<Login />);

      await user.type(getByLabelText('Email*'), 'test@testing.com');
      await user.type(getByLabelText('Password*'), 'wrong');
      fireEvent.click(getByRole('button', { name: 'Login' }));

      const errorMessage = await findByText('Invalid credentials');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });
});
