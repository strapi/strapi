import { fireEvent, waitFor } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ResetPassword } from '../ResetPassword';

const DEFAULT_POLICY = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
};

const FIELD_LABELS = ['Password', 'Confirm Password'];

describe('ResetPassword', () => {
  it('renders correctly', () => {
    const { getByRole, getByLabelText } = render(<ResetPassword />, {
      initialEntries: [{ search: '?code=test' }],
    });

    expect(getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();

    FIELD_LABELS.forEach((label) => {
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeInTheDocument();
    });

    expect(getByRole('button', { name: 'Change password' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Ready to sign in?' })).toBeInTheDocument();
  });

  describe('validation', () => {
    it('should fail if we do not fill the confirm password field', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Password*'), 'Testing123!');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Passwords must match')).toBeInTheDocument();
    });

    it('should fail if we do not fill in the password field', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Confirm Password*'), 'Testing123!');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(await findByText('Passwords must match')).toBeInTheDocument();
    });

    it('should fail if the passwords do not match', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Password*'), 'Testing123!');
      await user.type(getByLabelText('Confirm Password*'), 'Testing1234!');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Passwords must match')).toBeInTheDocument();
    });

    it('should fail if the password is too short', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Password*'), 'aA1!');
      await user.type(getByLabelText('Confirm Password*'), 'aA1!');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Password must be at least 8 characters')).toBeInTheDocument();
    });

    it('should fail if the password is too long', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Password*'), 'aA1!' + 'a'.repeat(70));
      await user.type(getByLabelText('Confirm Password*'), 'aA1!' + 'a'.repeat(70));

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Password must be less than 73 bytes')).toBeInTheDocument();
    });

    it.each([
      ['PASSWORD123!', 'Password must contain at least one lowercase character'],
      ['password123!', 'Password must contain at least one uppercase character'],
      ['Password!!', 'Password must contain at least one number'],
    ])('should display the strength error for %s', async (password, expectedMessage) => {
      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      await user.type(getByLabelText('Password*'), password);
      await user.type(getByLabelText('Confirm Password*'), password);

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText(expectedMessage)).toBeInTheDocument();
    });
  });

  describe('password policy', () => {
    it('follows the policy configured on the server', async () => {
      server.use(
        http.get('/admin/password-policy', () =>
          HttpResponse.json({
            data: {
              minLength: 12,
              requireLowercase: true,
              requireUppercase: true,
              requireNumber: true,
              requireSpecialCharacter: true,
            },
            meta: { floor: DEFAULT_POLICY },
          })
        )
      );

      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      expect(
        await findByText(
          'Must be at least 12 characters, 1 lowercase, 1 uppercase, 1 number, 1 special character'
        )
      ).toBeInTheDocument();

      // Valid for the default policy, not for the configured one
      await user.type(getByLabelText('Password*'), 'Testing123');
      await user.type(getByLabelText('Confirm Password*'), 'Testing123');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(await findByText('Password must be at least 12 characters')).toBeInTheDocument();
    });

    describe('when the request fails', () => {
      let resetRequests: number;

      beforeEach(() => {
        resetRequests = 0;

        server.use(
          http.get('/admin/password-policy', () =>
            HttpResponse.json(
              { data: null, error: { status: 500, name: 'InternalServerError', message: 'Boom' } },
              { status: 500 }
            )
          ),
          http.post('/admin/reset-password', () => {
            resetRequests += 1;

            return HttpResponse.json(
              { data: null, error: { status: 400, name: 'ValidationError', message: 'Invalid' } },
              { status: 400 }
            );
          })
        );
      });

      it('still requires the minimum of every policy', async () => {
        const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
          initialEntries: [{ search: '?code=test' }],
        });

        expect(await findByText('Must be at least 8 characters')).toBeInTheDocument();

        await user.type(getByLabelText('Password*'), 'short');
        await user.type(getByLabelText('Confirm Password*'), 'short');
        fireEvent.click(getByRole('button', { name: 'Change password' }));

        expect(await findByText('Password must be at least 8 characters')).toBeInTheDocument();
        expect(resetRequests).toBe(0);
      });

      it('leaves the other rules to the server, whose saved policy may be weaker', async () => {
        const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
          initialEntries: [{ search: '?code=test' }],
        });

        expect(await findByText('Must be at least 8 characters')).toBeInTheDocument();

        await user.type(getByLabelText('Password*'), 'testing123');
        await user.type(getByLabelText('Confirm Password*'), 'testing123');
        fireEvent.click(getByRole('button', { name: 'Change password' }));

        await waitFor(() => expect(resetRequests).toBe(1));
        expect(
          screen.queryByText('Password must contain at least one uppercase character')
        ).not.toBeInTheDocument();
      });
    });
  });
});
