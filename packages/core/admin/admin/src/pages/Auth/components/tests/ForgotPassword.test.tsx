import { fireEvent } from '@testing-library/react';
import { render } from '@tests/utils';

import { ForgotPassword } from '../ForgotPassword';

const FIELD_LABELS = ['Email'];

describe('ResetPassword', () => {
  it('renders correctly', () => {
    const { getByRole, getByLabelText } = render(<ForgotPassword />);

    expect(getByRole('heading', { name: 'Password Recovery' })).toBeInTheDocument();

    FIELD_LABELS.forEach((label) => {
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeInTheDocument();
    });

    expect(getByRole('button', { name: 'Send Email' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Ready to sign in?' })).toBeInTheDocument();
  });

  describe('validation', () => {
    it('should fail if we do not fill a valid email', async () => {
      const { getByRole, findByText, getByLabelText, user } = render(<ForgotPassword />);

      await user.type(getByLabelText('Email*'), 'Testing123!');

      fireEvent.click(getByRole('button', { name: 'Send Email' }));

      expect(await findByText(/This is not a valid email./)).toBeInTheDocument();
    });
  });
});
