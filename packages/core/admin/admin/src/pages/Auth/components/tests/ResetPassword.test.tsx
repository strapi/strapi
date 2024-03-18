import { fireEvent } from '@testing-library/react';
import { render } from '@tests/utils';

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
  });
});
