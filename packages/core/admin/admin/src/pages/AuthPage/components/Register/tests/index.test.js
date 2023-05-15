import React from 'react';
import { act, render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { TrackingProvider, useQuery, useNotification } from '@strapi/helper-plugin';
import { createMemoryHistory } from 'history';
import * as yup from 'yup';
import { IntlProvider } from 'react-intl';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import Register from '..';

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

const ComponentFixture = (props) => {
  const history = createMemoryHistory();

  return (
    <IntlProvider locale="en" messages={{}}>
      <TrackingProvider>
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <Register
              authType="register-admin"
              fieldsToDisable={[]}
              noSignin
              onSubmit={() => {}}
              schema={yup.object()}
              {...props}
            />
          </Router>
        </ThemeProvider>
      </TrackingProvider>
    </IntlProvider>
  );
};

const setup = (props) => {
  const user = userEvent.setup();

  return {
    ...render(<ComponentFixture {...props} />),
    user,
  };
};

describe('ADMIN | PAGES | AUTH | Register', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
    await user.type(getByLabelText(/^Password/i), ' secret ');
    await user.type(getByLabelText(/Confirm Password/i), ' secret ');

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /let's start/i }));
    });

    expect(spy).toHaveBeenCalledWith(
      {
        firstname: 'First name',
        lastname: 'Last name',
        email: 'test@strapi.io',
        news: false,
        registrationToken: undefined,
        confirmPassword: ' secret ',
        password: ' secret ',
      },
      expect.any(Object)
    );
  });

  it('Disable fields', () => {
    const { getByLabelText } = setup({
      fieldsToDisable: ['email', 'firstname'],
    });

    expect(getByLabelText(/Firstname/i)).not.toHaveAttribute('disabled');
    expect(getByLabelText(/Email/i)).toHaveAttribute('disabled');
  });

  it('Set defaults if the registration token is set and omits it when submitting', async () => {
    const spy = jest.fn();
    const query = useQuery();
    query.get.mockReturnValue('my-token');

    const { getByLabelText, getByRole } = setup({ onSubmit: spy });

    await waitFor(() => expect(getByLabelText(/Firstname/i)).toHaveValue('Token firstname'));

    expect(getByLabelText(/Lastname/i)).toHaveValue('Token lastname');
    expect(getByLabelText(/Email/i)).toHaveValue('test+register-token@strapi.io');

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /let's start/i }));
    });

    expect(spy).toHaveBeenCalledWith(
      {
        registrationToken: 'my-token',
        userInfo: expect.not.objectContaining({
          registrationToken: expect.any(String),
        }),
      },
      expect.any(Object)
    );
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

  it('Violates the yup schema and displays error messages', async () => {
    const { getByText, getByRole } = setup({
      schema: yup.object().shape({
        firstname: yup.string().trim().required(),
        lastname: yup.string(),
        password: yup.string().required(),
        email: yup.string().required(),
        confirmPassword: yup.string().required(),
      }),
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /let's start/i }));
    });

    expect(getByText(/firstname is a required field/i)).toBeInTheDocument();
    expect(getByText(/email is a required field/i)).toBeInTheDocument();
    expect(getByText(/^password is a required field/i)).toBeInTheDocument();
    expect(getByText(/confirmpassword is a required field/i)).toBeInTheDocument();
  });
});
