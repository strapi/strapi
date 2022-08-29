import React from 'react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import reducers from '../../../hooks/reducers';
import LocaleSelect from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
}));

jest.mock('../../../hooks/useLocales', () =>
  jest.fn().mockReturnValue({
    locales: [
      {
        code: 'en',
        name: 'English (en)',
        id: 2,
        isDefault: true,
      },
    ],
  })
);

jest.mock('../../../hooks/useDefaultLocales', () =>
  jest.fn().mockReturnValue({
    defaultLocales: [
      {
        code: 'af',
        name: 'Afrikaans (af)',
      },
      {
        code: 'en',
        name: 'English (en)',
      },
      {
        code: 'fr',
        name: 'French (fr)',
      },
    ],

    isLoading: false,
  })
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const store = createStore(combineReducers(reducers));

const render = (props) =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <IntlProvider messages={{}} locale="en">
        <Provider store={store}>
          <ThemeProvider theme={lightTheme}>
            <LocaleSelect {...props} />
          </ThemeProvider>
        </Provider>
      </IntlProvider>
    </QueryClientProvider>
  );

describe('LocaleSelect', () => {
  it('shows an aria-busy element when loading the data', async () => {
    const { container } = render();

    expect(container.firstChild).toMatchSnapshot();
  });

  it('only shows the locales that have not already been used', async () => {
    render();

    await waitFor(() =>
      expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );
    fireEvent.click(screen.getByLabelText('Locales'));
    await waitFor(() => screen.getByText('Afrikaans (af)'));

    expect(screen.getByText('Afrikaans (af)')).toBeVisible();
    expect(screen.getByText('French (fr)')).toBeVisible();
    expect(screen.queryByText('English (en)')).toBeFalsy();
  });

  it('brings back an object of code and displayName keys when changing', async () => {
    const onLocaleChangeSpy = jest.fn();
    render({ onLocaleChange: onLocaleChangeSpy });

    await waitFor(() =>
      expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );
    fireEvent.click(screen.getByLabelText('Locales'));
    await waitFor(() => screen.getByText('Afrikaans (af)'));
    fireEvent.click(screen.getByText('French (fr)'));

    expect(onLocaleChangeSpy).toBeCalledWith({ code: 'fr', displayName: 'French (fr)' });
  });
});
