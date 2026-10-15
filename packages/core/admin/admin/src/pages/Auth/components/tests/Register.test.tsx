import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

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

  it('does not toast when registration-info is refetched after a successful invite', async () => {
    let registrationInfoRequests = 0;

    server.use(
      http.get('/admin/registration-info', () => {
        registrationInfoRequests += 1;

        if (registrationInfoRequests > 1) {
          return HttpResponse.json(
            {
              error: {
                name: 'ValidationError',
                message: 'Invalid registrationToken',
                status: 400,
              },
            },
            { status: 400 }
          );
        }

        return HttpResponse.json({
          data: {
            email: 'invitee@example.com',
            firstname: 'Invitee',
            lastname: 'User',
          },
        });
      }),
      http.post('/admin/register', () =>
        HttpResponse.json({
          data: {
            token: 'registered-token',
            user: {
              id: 2,
              email: 'invitee@example.com',
              firstname: 'Invitee',
              lastname: 'User',
            },
          },
        })
      )
    );

    render(<Register />, {
      initialEntries: ['/auth/register?registrationToken=invite-token'],
    });

    await waitFor(() => expect(screen.getByLabelText(/^Firstname/i)).toHaveValue('Invitee'));

    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Testing123!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/i), {
      target: { value: 'Testing123!' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Welcome to Strapi!' })).not.toBeInTheDocument()
    );
    expect(registrationInfoRequests).toBeGreaterThan(1);
    expect(screen.queryByText('Invalid registrationToken')).not.toBeInTheDocument();
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
