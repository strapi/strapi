import React from 'react';
import { act } from 'react-dom/test-utils';
import { getByLabelText, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { useRBAC } from '@strapi/helper-plugin';
import server from './server';
import { SingleSignOn } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <SingleSignOn />
    </IntlProvider>
  </ThemeProvider>
);

describe('Admin | ee | SettingsPage | SSO', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const {
      container: { firstChild },
    } = render(App);

    await waitFor(() =>
      expect(
        screen.getByText('Create new user on SSO login if no account exists')
      ).toBeInTheDocument()
    );

    expect(firstChild).toMatchSnapshot();
  });

  it('should disable the form when there is no change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { getByTestId } = render(App);

    await waitFor(() =>
      expect(
        screen.getByText('Create new user on SSO login if no account exists')
      ).toBeInTheDocument()
    );

    expect(getByTestId('save-button')).toHaveAttribute('aria-disabled');
  });

  it('should not disable the form when there is a change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { container } = render(App);
    let el;

    await act(async () => {
      await waitFor(() => {
        el = getByLabelText(container, 'autoRegister');
      });
    });

    fireEvent.click(el);

    expect(screen.getByTestId('save-button')).not.toBeDisabled();
  });
});
