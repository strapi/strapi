import { fireEvent } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ResetPassword } from '../ResetPassword';

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

    it('falls back to the default policy when the request fails', async () => {
      server.use(
        http.get('/admin/password-policy', () =>
          HttpResponse.json(
            { data: null, error: { status: 500, name: 'InternalServerError', message: 'Boom' } },
            { status: 500 }
          )
        )
      );

      const { getByRole, findByText, getByLabelText, user } = render(<ResetPassword />, {
        initialEntries: [{ search: '?code=test' }],
      });

      expect(
        await findByText('Must be at least 8 characters, 1 uppercase, 1 lowercase & 1 number')
      ).toBeInTheDocument();

      await user.type(getByLabelText('Password*'), 'testing123');
      await user.type(getByLabelText('Confirm Password*'), 'testing123');

      fireEvent.click(getByRole('button', { name: 'Change password' }));

      expect(
        await findByText('Password must contain at least one uppercase character')
      ).toBeInTheDocument();
      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
    });
  });
});
