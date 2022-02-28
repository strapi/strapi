import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
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
      .c8 {
        padding-left: 12px;
      }

      .c3 {
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

      .c5 {
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
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c9 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c9 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c9 svg path {
        fill: #666687;
      }

      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c10 svg {
        width: 0.375rem;
      }

      .c2 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c0 {
        border: 0;
        -webkit-clip: rect(0 0 0 0);
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c4 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c6 {
        display: grid;
        -webkit-flex: 1 1 0%;
        -ms-flex: 1 1 0%;
        flex: 1 1 0%;
        position: relative;
      }

      .c7 {
        display: inline-grid;
        grid-area: 1 / 1 / 2 / 3;
        grid-template-columns: 0px min-content;
        background: transparent;
        min-height: 2.5rem;
        border: none;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
        font-size: 0.875rem;
        color: #32324d;
        outline: none;
      }

      .c7:focus-visible {
        outline: none;
        box-shadow: none;
        outline-offset: 0;
      }

      .c7[aria-disabled='true'] {
        background: inherit;
        color: inherit;
        cursor: not-allowed;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c1 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c1 > * + * {
        margin-top: 4px;
      }

      <div>
        <div
          aria-atomic="false"
          aria-live="polite"
          aria-relevant="additions text"
          class="c0"
        />
        <div
          class="c1"
        >
          <label
            class="c2"
            for="combobox-1"
            id="combobox-1-label"
          >
            Locales
          </label>
          <div
            class="c3 c4"
          >
            <div
              class="c5 c6"
              wrap="wrap"
            >
              
              <input
                aria-activedescendant=""
                aria-autocomplete="list"
                aria-controls="combobox-1-listbox"
                aria-disabled="false"
                aria-expanded="false"
                aria-haspopup="listbox"
                aria-labelledby="combobox-1-label"
                autocomplete="off"
                autocorrect="off"
                class="c7"
                id="combobox-1"
                placeholder="Select or enter a value"
                role="combobox"
                spellcheck="off"
                type="text"
                value=""
              />
            </div>
            <div
              class="c3"
            >
              
              <button
                aria-hidden="true"
                class="c8 c9 c10"
                tabindex="-1"
                type="button"
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

  // it('only shows the locales that have not already been used', async () => {
  //   render();

  //   await waitFor(() =>
  //     expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
  //   );
  //   fireEvent.click(screen.getByLabelText('Locales'));
  //   await waitFor(() => screen.getByText('Afrikaans (af)'));

  //   expect(screen.getByText('Afrikaans (af)')).toBeVisible();
  //   expect(screen.getByText('French (fr)')).toBeVisible();
  //   expect(screen.queryByText('English (en)')).toBeFalsy();
  // });

  // it('brings back an object of code and displayName keys when changing', async () => {
  //   const onLocaleChangeSpy = jest.fn();
  //   render({ onLocaleChange: onLocaleChangeSpy });

  //   await waitFor(() =>
  //     expect(screen.queryByText('Loading the available locales...')).not.toBeInTheDocument()
  //   );
  //   fireEvent.click(screen.getByLabelText('Locales'));
  //   await waitFor(() => screen.getByText('Afrikaans (af)'));
  //   fireEvent.click(screen.getByText('French (fr)'));

  //   expect(onLocaleChangeSpy).toBeCalledWith({ code: 'fr', displayName: 'French (fr)' });
  // });
});
