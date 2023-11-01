import { fireEvent } from '@testing-library/react';
import { render, waitFor } from '@tests/utils';

import { Register } from '../Register';

const PASSWORD_VALID = '!Eight_8_characters!';

describe.skip('AUTH | Register', () => {
  it('Render form elements', () => {
    const { getByText, getByRole, getByLabelText } = render(<Register />);

    const labels = ['Firstname', 'Lastname', 'Email', 'Password', 'Confirm Password'];

    labels.forEach((label) => {
      expect(getByText(label)).toBeInTheDocument();
      expect(getByLabelText(new RegExp(`^${label}`, 'i'))).toBeInTheDocument();
    });

    expect(
      getByText(
        /keep me updated about new features & upcoming improvements \(by doing this you accept the and the \)\./i
      )
    ).toBeInTheDocument();
    expect(getByRole('checkbox', { name: /news/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /let's start/i })).toBeInTheDocument();
  });

  it('Serialize the form and normalize input values', async () => {
    const spy = jest.fn();
    const { getByRole, getByLabelText, user } = render(<Register />);

    await user.type(getByLabelText(/Firstname/i), ' First name ');
    await user.type(getByLabelText(/Lastname/i), ' Last name ');
    await user.type(getByLabelText(/Email/i), ' test@strapi.io ');
    await user.type(getByLabelText(/^Password/i), PASSWORD_VALID);
    await user.type(getByLabelText(/Confirm Password/i), PASSWORD_VALID);

    fireEvent.click(getByRole('button', { name: /let's start/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        {
          firstname: 'First name',
          lastname: 'Last name',
          email: 'test@strapi.io',
          news: false,
          registrationToken: undefined,
          confirmPassword: PASSWORD_VALID,
          password: PASSWORD_VALID,
        },
        expect.any(Object)
      )
    );
  });

  it('Validates optional Lastname value to be null', async () => {
    const spy = jest.fn();
    const { getByRole, getByLabelText, user } = render(<Register />);

    await user.type(getByLabelText(/Firstname/i), 'First name');
    await user.type(getByLabelText(/Email/i), 'test@strapi.io');
    await user.type(getByLabelText(/^Password/i), PASSWORD_VALID);
    await user.type(getByLabelText(/Confirm Password/i), PASSWORD_VALID);

    fireEvent.click(getByRole('button', { name: /let's start/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        {
          firstname: 'First name',
          lastname: null,
          email: 'test@strapi.io',
          news: false,
          registrationToken: undefined,
          confirmPassword: PASSWORD_VALID,
          password: PASSWORD_VALID,
        },
        expect.any(Object)
      )
    );
  });

  it('Validates optional Lastname value to be empty space', async () => {
    const spy = jest.fn();
    const { getByRole, getByLabelText, user } = render(<Register />);

    await user.type(getByLabelText(/Firstname/i), 'First name');
    await user.type(getByLabelText(/Lastname/i), ' ');
    await user.type(getByLabelText(/Email/i), 'test@strapi.io');
    await user.type(getByLabelText(/^Password/i), PASSWORD_VALID);
    await user.type(getByLabelText(/Confirm Password/i), PASSWORD_VALID);

    fireEvent.click(getByRole('button', { name: /let's start/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        {
          firstname: 'First name',
          lastname: null,
          email: 'test@strapi.io',
          news: false,
          registrationToken: undefined,
          confirmPassword: PASSWORD_VALID,
          password: PASSWORD_VALID,
        },
        expect.any(Object)
      )
    );
  });

  it('Disable fields', () => {
    const { getByLabelText } = render(<Register />);

    expect(getByLabelText(/Firstname/i)).toBeEnabled();
    expect(getByLabelText(/Email/i)).toBeDisabled();
  });

  it('Shows an error notification if the token does not exist', async () => {
    const { findByText } = render(<Register />, {
      initialEntries: ['/?registrationToken=error'],
    });

    await findByText('Request failed with status code 500');
  });
});
