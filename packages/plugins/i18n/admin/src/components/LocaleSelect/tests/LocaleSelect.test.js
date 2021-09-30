import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
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
      .c3 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c3:focus {
        outline: none;
      }

      .c1 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c8 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c7 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c9 {
        padding-left: 12px;
      }

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 {
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

      .c2 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .c2:focus-within {
        border: 1px solid #4945ff;
      }

      .c10 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c10 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c10 svg path {
        fill: #666687;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c11 svg {
        width: 0.375rem;
      }

      .c5 {
        min-height: 2.5rem;
      }

      <div>
        <div
          class="c0"
        >
          <span
            class="c1"
            for="select-1"
            id="select-1-label"
          >
            Locales
          </span>
          <div
            class="c2"
          >
            <button
              aria-busy="true"
              aria-disabled="false"
              aria-expanded="false"
              aria-haspopup="listbox"
              aria-labelledby="select-1-label select-1-content"
              class="c3"
              id="select-1"
              type="button"
            />
            <div
              class="c4 c5"
            >
              <div
                class="c6"
              >
                <div
                  class="c7"
                >
                  <span
                    class="c8"
                    id="select-1-content"
                  >
                    Select...
                  </span>
                </div>
              </div>
              <div
                class="c6"
              >
                
                <button
                  aria-hidden="true"
                  class="c9 c10 c11"
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
