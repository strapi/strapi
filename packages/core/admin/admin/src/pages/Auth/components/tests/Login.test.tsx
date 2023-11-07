import { fireEvent } from '@testing-library/react';
import { render } from '@tests/utils';

import { Login } from '../Login';

const FIELD_LABELS = ['Email', 'Password', 'Remember me'];

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
});
