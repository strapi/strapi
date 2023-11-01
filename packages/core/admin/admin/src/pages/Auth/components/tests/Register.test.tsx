import { render } from '@tests/utils';

import { Register } from '../Register';

describe('Register', () => {
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

  it('Disable fields when the route is register', () => {
    const { getByLabelText } = render(<Register />, {
      initialEntries: ['/register'],
    });

    expect(getByLabelText(/Firstname/i)).toBeEnabled();
    expect(getByLabelText(/Email/i)).toBeDisabled();
  });

  it('Shows an error notification if the token does not exist', async () => {
    const { findByText } = render(<Register />, {
      initialEntries: ['/register?registrationToken=error'],
    });

    await findByText('Request failed with status code 500');
  });
});
