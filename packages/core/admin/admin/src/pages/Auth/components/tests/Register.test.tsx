import { render } from '@tests/utils';

import { Register } from '../Register';

const FIELD_LABELS = ['Firstname', 'Lastname', 'Email', 'Password', 'Confirm Password'];

describe('Register', () => {
  it('renders correctly', () => {
    const { getByText, getByRole, getByLabelText } = render(<Register />, {
      initialEntries: ['/auth/register'],
    });

    expect(getByRole('heading', { name: 'Welcome to Strapi!' })).toBeInTheDocument();
    expect(
      getByText(
        'Credentials are only used to authenticate in Strapi. All saved data will be stored in your database.'
      )
    ).toBeInTheDocument();

    FIELD_LABELS.forEach((label) => {
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeInTheDocument();
    });

    expect(
      getByText(
        /keep me updated about new features & upcoming improvements \(by doing this you accept the and the \)\./i
      )
    ).toBeInTheDocument();
    expect(getByRole('checkbox', { name: /Keep me updated/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /let's start/i })).toBeInTheDocument();
  });

  it('should disable the email field on the register field', () => {
    const { getByLabelText } = render(<Register />, {
      initialEntries: ['/auth/register'],
    });

    FIELD_LABELS.forEach((label) => {
      if (label === 'Email') {
        expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeDisabled();
      } else {
        expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeEnabled();
      }
    });
  });

  it('should enable all fields on the register-admin route', () => {
    const { getByLabelText } = render(<Register />, {
      initialEntries: ['/auth/register-admin'],
    });

    FIELD_LABELS.forEach((label) => {
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeEnabled();
    });
  });
});
