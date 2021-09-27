import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL, fireEvent, waitFor, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';
import en from '../../../translations/en.json';
import server from './server';
import reducers from '../../../hooks/reducers';
import LocaleSelect from '..';

jest.mock('../../../utils', () => ({
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const store = createStore(combineReducers(reducers));

const render = props =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <LocaleSelect {...props} />
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>,
    { container: document.body }
  );

describe('LocaleSelect', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows an aria-busy element when loading the data', async () => {
    const { container } = render();

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c5 {
        padding-left: 12px;
      }

      .c2 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c6 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c6 svg path {
        fill: #666687;
      }

      .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c7 svg {
        width: 0.375rem;
      }

      .c1 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c3 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        background: #ffffff;
      }

      .c3:focus-within {
        outline: 2px solid #4945ff;
        outline-offset: 2px;
        box-shadow: revert;
      }

      .c4 {
        min-height: 2.5rem;
        border: none;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
        font-size: 0.875rem;
        color: #32324d;
      }

      .c4:focus-visible {
        outline: none;
        box-shadow: none;
        outline-offset: 0;
      }

      .c4[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c0 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c0 > * + * {
        margin-top: 4px;
      }

      <div>
        <div
          class="c0"
        >
          <label
            class="c1"
            for="combobox-1"
            id="combobox-1-label"
          >
            Locales
          </label>
          <div
            class="c2 c3"
          >
            <input
              aria-activedescendant=""
              aria-autocomplete="list"
              aria-busy="true"
              aria-controls="combobox-1-listbox"
              aria-describedby="combobox-1-label"
              aria-disabled="false"
              aria-expanded="false"
              aria-haspopup="listbox"
              class="c4"
              id="combobox-1"
              placeholder="Select or enter a value"
              role="combobox"
              type="text"
              value=""
            />
            <div
              class="c2"
            >
              <button
                aria-hidden="true"
                class="c5 c6 c7"
                tabindex="-1"
              >
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 14 8"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clip-rule="evenodd"
                    d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
                    fill="#32324D"
                    fill-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
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
