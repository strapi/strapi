import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider, useNotification, useQuery } from '@strapi/helper-plugin';
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import Register from '..';
import { FORMS } from '../../../constants';

const PASSWORD_VALID = '!Eight_8_characters!';

jest.mock('../../../../../hooks/useConfigurations');
jest.mock('../../../../../components/LocalesProvider/useLocalesProvider');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQuery: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
  useNotification: jest.fn().mockReturnValue(jest.fn()),
}));

const server = setupServer(
  rest.get('*/registration-info', async (req, res, ctx) => {
    const token = req.url.searchParams.get('registrationToken');

    if (token === 'error') {
      return res(ctx.status(401), ctx.json({}));
    }

    return res(
      ctx.json({
        data: {
          firstname: 'Token firstname',
          lastname: 'Token lastname',
          email: 'test+register-token@strapi.io',
        },
      })
    );
  })
);

const setup = (props) => {
  const user = userEvent.setup();

  return {
    ...render(
      <Register
        authType="register-admin"
        fieldsToDisable={[]}
        noSignin
        onSubmit={() => {}}
        schema={FORMS['register-admin'].schema}
        {...props}
      />,
      {
        wrapper({ children }) {
          const history = createMemoryHistory();

          return (
            <IntlProvider locale="en" messages={{}}>
              <TrackingProvider>
                <ThemeProvider theme={lightTheme}>
                  <Router history={history}>{children}</Router>
                </ThemeProvider>
              </TrackingProvider>
            </IntlProvider>
          );
        },
      }
    ),
    user,
  };
};

describe('ADMIN | PAGES | AUTH | Register Admin', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Render form elements', () => {
    const { getByText, getByRole, getByLabelText } = setup();

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
    const { getByRole, getByLabelText, user } = setup({ onSubmit: spy });

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
    const { getByRole, getByLabelText, user } = setup({ onSubmit: spy });

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
    const { getByRole, getByLabelText, user } = setup({ onSubmit: spy });

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
    const { getByLabelText } = setup({
      fieldsToDisable: ['email', 'firstname'],
    });

    expect(getByLabelText(/Firstname/i)).not.toHaveAttribute('disabled');
    expect(getByLabelText(/Email/i)).toHaveAttribute('disabled');
  });

  it('Shows an error notification if the token does not exist', async () => {
    const query = useQuery();
    const toggleNotification = useNotification();

    query.get.mockReturnValue('error');

    setup();

    await waitFor(() => expect(toggleNotification).toHaveBeenCalled());

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: expect.any(String),
    });
  });
});
