import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { useRBAC, useNotification } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';
import ListView from '../index';
import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const history = createMemoryHistory();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = (
  <ThemeProvider theme={lightTheme}>
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
        <Router history={history}>
          <ListView />
        </Router>
      </IntlProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

describe('Admin | containers | ListView', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('should show a loader when data is loading and then display the data', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    useNotification.mockImplementation(() => jest.fn());

    render(App);

    const loadingElement = await screen.findByText('Loading content.');

    expect(loadingElement).toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.getByText('Loading content.'));

    expect(screen.getByText('http:://strapi.io')).toBeInTheDocument();
  });

  it('should show a loader when permissions are loading', () => {
    useRBAC.mockImplementation(() => ({
      isLoading: true,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    useNotification.mockImplementation(() => jest.fn());

    const { getByText } = render(App);

    expect(getByText('Loading content.')).toBeInTheDocument();
  });

  it('should show a list of webhooks', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    render(App);

    await waitFor(() => {
      expect(screen.getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should show confirmation delete modal', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    const { container, getByText } = render(App);
    await waitFor(() => {
      screen.getByText('http:://strapi.io');
    });

    fireEvent.click(container.querySelector('#delete-1'));

    expect(getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('should delete all webhooks', async () => {
    const user = userEvent.setup();

    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    useNotification.mockImplementation(() => jest.fn());

    const { container, getByText, getByRole } = render(App);
    await waitFor(() => {
      screen.getByText('http:://strapi.io');
    });

    fireEvent.click(container.querySelector('#select-all'));
    fireEvent.click(container.querySelector('#delete-selected'));

    expect(getByText('Are you sure you want to delete this?')).toBeInTheDocument();

    await act(async () => {
      await user.click(getByRole('button', { name: /confirm/i }));
    });

    expect(getByText('No webhooks found')).toBeInTheDocument();
  });

  it('should delete a single webhook', async () => {
    const user = userEvent.setup();

    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    useNotification.mockImplementation(() => jest.fn());

    const { container, getByText, getByRole, queryByText } = render(App);
    await waitFor(() => {
      screen.getByText('http:://strapi.io');
    });
    fireEvent.click(container.querySelector('#delete-1'));

    expect(getByText('Are you sure you want to delete this?')).toBeInTheDocument();

    await act(async () => {
      await user.click(getByRole('button', { name: /confirm/i }));
    });

    expect(queryByText('http:://strapi.io')).toBeNull();
    expect(getByText('http://me.io')).toBeInTheDocument();
  });
});
