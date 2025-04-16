import React from 'react';

import { render } from '@testing-library/react';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';

import { login } from '../../../../../admin/src/reducer';
import { getCookieValue } from '../../../../../admin/src/utils/cookies';
import { AuthResponse } from '../AuthResponse';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useMatch: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: any) => defaultMessage,
  }),
}));

jest.mock('../../../../../admin/src/services/auth', () => ({
  ...jest.requireActual('../../../../../admin/src/services/auth'),
  useGetProvidersQuery: jest.fn(),
  useGetMeQuery: jest.fn(() => ({ data: null, isLoading: false })),
}));

jest.mock('../../../../../admin/src/features/Auth', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('../../../../../admin/src/reducer', () => ({
  login: jest.fn(),
}));

jest.mock('../../../../../admin/src/utils/cookies', () => ({
  getCookieValue: jest.fn(),
}));

const dispatchMock = jest.fn();
jest.mock('../../../../../admin/src/core/store/hooks', () => ({
  useTypedDispatch: () => dispatchMock,
}));

const navigateMock = jest.fn();

describe('<AuthResponse />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /auth/oops on error', () => {
    (useMatch as jest.Mock).mockReturnValue({ params: { authResponse: 'error' } });
    (useNavigate as jest.Mock).mockReturnValue(navigateMock);

    render(<AuthResponse />);

    // Get the first call's first argument
    const call = navigateMock.mock.calls[0][0];

    expect(call.pathname).toBe('/auth/oops');
    expect(decodeURIComponent(call.search)).toContain(
      'We cannot connect you through the selected provider.'
    );
  });

  it('dispatches login and redirects on success with token', () => {
    (useMatch as jest.Mock).mockReturnValue({ params: { authResponse: 'success' } });
    (useNavigate as jest.Mock).mockReturnValue(navigateMock);
    (getCookieValue as jest.Mock).mockReturnValue('fake-token');

    render(<AuthResponse />);

    expect(dispatchMock).toHaveBeenCalledWith(
      login({
        token: 'fake-token',
      })
    );
    expect(navigateMock).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to /auth/oops on success with no token', () => {
    (useMatch as jest.Mock).mockReturnValue({ params: { authResponse: 'success' } });
    (useNavigate as jest.Mock).mockReturnValue(navigateMock);
    (getCookieValue as jest.Mock).mockReturnValue(null);

    render(<AuthResponse />);

    const call = navigateMock.mock.calls[0][0];

    expect(call.pathname).toBe('/auth/oops');
    expect(decodeURIComponent(call.search)).toContain(
      'We cannot connect you through the selected provider.'
    );
  });

  it('always renders loading screen', () => {
    (useMatch as jest.Mock).mockReturnValue(null);
    (useNavigate as jest.Mock).mockReturnValue(jest.fn());

    const { getByText } = render(<AuthResponse />);

    expect(getByText(/loading/i)).toBeInTheDocument();
  });
});
