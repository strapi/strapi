import { render } from '@tests/utils';

import { Register, formatValidationMessage } from '../Register';

import type { IntlShape } from 'react-intl';

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

  describe('formatValidationMessage', () => {
    /**
     * `components.Input.error.validation.minLength` is translated as
     * "The value is too short (min: {min})." — dropping the descriptor's `values` made react-intl
     * render that raw pattern under the password field. See strapi/strapi#19030.
     */
    const MIN_LENGTH_DESCRIPTOR = {
      id: 'components.Input.error.validation.minLength',
      defaultMessage: 'Password must be at least 8 characters',
      values: { min: 8 },
    };

    const formatMessage = ((
      { id, defaultMessage }: { id: string; defaultMessage: string },
      values?: Record<string, unknown>
    ) => {
      const pattern =
        id === MIN_LENGTH_DESCRIPTOR.id ? 'The value is too short (min: {min}).' : defaultMessage;

      return pattern.replace(/\{(\w+)\}/g, (match, key) =>
        values && key in values ? String(values[key]) : match
      );
    }) as IntlShape['formatMessage'];

    it('interpolates the values carried by a descriptor', () => {
      expect(formatValidationMessage(MIN_LENGTH_DESCRIPTOR, formatMessage)).toBe(
        'The value is too short (min: 8).'
      );
    });

    it('interpolates the values of a wrapped descriptor', () => {
      expect(formatValidationMessage({ message: MIN_LENGTH_DESCRIPTOR }, formatMessage)).toBe(
        'The value is too short (min: 8).'
      );
    });

    it('interpolates the values of the first descriptor of an errors array', () => {
      expect(formatValidationMessage({ errors: [MIN_LENGTH_DESCRIPTOR] }, formatMessage)).toBe(
        'The value is too short (min: 8).'
      );
    });

    it('passes plain strings through untouched', () => {
      expect(formatValidationMessage('Passwords must match', formatMessage)).toBe(
        'Passwords must match'
      );
    });

    it('returns an empty string for a missing message', () => {
      expect(formatValidationMessage(undefined, formatMessage)).toBe('');
    });
  });
});
