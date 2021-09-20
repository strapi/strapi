import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { useRBAC } from '@strapi/helper-plugin';
import ProtectedAdvancedSettingsPage from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const App = (
  <QueryClientProvider client={client}>
    <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
      <ThemeProvider theme={lightTheme}>
        <ProtectedAdvancedSettingsPage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('ADMIN | Pages | Settings | Advanced Settings', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    jest.resetAllMocks();
    server.close();
  });

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true },
    }));

    const { container } = render(App);
    await waitFor(() => {
      expect(screen.getByText('Default role for authenticated users')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c15 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c10 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c11 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c8 {
        padding-right: 8px;
      }

      .c5 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
      }

      .c5 svg {
        height: 12px;
        width: 12px;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #ffffff;
      }

      .c5[aria-disabled='true'] {
        pointer-events: none;
      }

      .c6 {
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c6 .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 .c9 {
        color: #ffffff;
      }

      .c6[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true'] .c9 {
        color: #666687;
      }

      .c6[aria-disabled='true'] svg > g,
      .c6[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c6[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true']:active .c9 {
        color: #666687;
      }

      .c6[aria-disabled='true']:active svg > g,
      .c6[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c6:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c6:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c23 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c23:focus {
        outline: none;
      }

      .c21 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c28 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c32 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c27 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c29 {
        padding-left: 12px;
      }

      .c24 {
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

      .c26 {
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

      .c20 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 4px;
      }

      .c22 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .c22:focus-within {
        border: 1px solid #4945ff;
      }

      .c30 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c30 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c30 svg path {
        fill: #666687;
      }

      .c31 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c31 svg {
        width: 0.375rem;
      }

      .c25 {
        min-height: 2.5rem;
      }

      .c16 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c16 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c16 > * + * {
        margin-top: 16px;
      }

      .c17 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c53 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c57 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c52 {
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

      .c54 {
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

      .c56 {
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        height: 2.5rem;
      }

      .c56::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c56::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c56:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c56::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c56[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c55 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
      }

      .c58 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        color: #666687;
        background: #eaeaef;
      }

      .c51 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c51 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c51 > * + * {
        margin-top: 4px;
      }

      .c50 textarea {
        height: 5rem;
      }

      .c37 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c45 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #b72b1a;
      }

      .c48 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c41 {
        background: #ffffff;
        border-radius: 4px;
      }

      .c43 {
        background: #fcecea;
        padding-top: 12px;
        padding-right: 32px;
        padding-bottom: 12px;
        padding-left: 32px;
      }

      .c46 {
        padding-top: 12px;
        padding-right: 32px;
        padding-bottom: 12px;
        padding-left: 32px;
      }

      .c36 {
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

      .c35 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c35 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c35 > * + * {
        margin-top: 4px;
      }

      .c39 {
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

      .c38 {
        position: relative;
        display: inline-block;
      }

      .c38:active,
      .c38:focus-within {
        outline: 2px solid #4945ff;
        outline-offset: 2px;
      }

      .c42 {
        position: relative;
        z-index: 1;
        border: 1px solid #dcdce4;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        overflow: hidden;
      }

      .c47 {
        text-transform: uppercase;
      }

      .c44 {
        text-transform: uppercase;
        border-right: 1px solid #dcdce4;
      }

      .c40 {
        position: absolute;
        left: 4px;
        top: 4px;
      }

      .c34 {
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c0 {
        outline: none;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c14 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c2 {
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

      .c4 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c12 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c13 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c18 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 24px;
      }

      .c19 {
        grid-column: span 6;
        word-break: break-all;
      }

      .c33 {
        grid-column: span 12;
        word-break: break-all;
      }

      .c49 {
        grid-column: span 6;
        word-break: break-all;
      }

      @media (max-width:68.75rem) {
        .c19 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c19 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c33 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c33 {
          grid-column: span 12;
        }
      }

      @media (max-width:68.75rem) {
        .c49 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c49 {
          grid-column: span 12;
        }
      }

      <main
        aria-busy="false"
        aria-labelledby="main-content-title"
        class="c0"
        id="main-content"
        tabindex="-1"
      >
        <form
          action="#"
          novalidate=""
        >
          <div
            style="height: 0px;"
          >
            <div
              class="c1"
              data-strapi-header="true"
            >
              <div
                class="c2"
              >
                <div
                  class="c3"
                >
                  <h1
                    class="c4"
                    id="main-content-title"
                  >
                    Advanced Settings
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c5 c6"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class="c7 c8"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 24 24"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                        fill="#212134"
                      />
                    </svg>
                  </div>
                  <span
                    class="c9 c10 c11"
                  >
                    Save
                  </span>
                </button>
              </div>
              <p
                class="c12 c13"
              />
            </div>
          </div>
          <div
            class="c14"
          >
            <div
              class="c15"
            >
              <div
                class="c16"
              >
                <h3
                  class="c17"
                >
                  Settings
                </h3>
                <div
                  class="c18"
                >
                  <div
                    class="c19"
                  >
                    <div
                      class=""
                    >
                      <div>
                        <div
                          class="c20"
                        >
                          <span
                            class="c21"
                            for="select-1"
                            id="select-1-label"
                          >
                            Default role for authenticated users
                          </span>
                          <div
                            class="c22"
                          >
                            <button
                              aria-describedby="select-1-hint"
                              aria-disabled="false"
                              aria-expanded="false"
                              aria-haspopup="listbox"
                              aria-labelledby="select-1-label select-1-content"
                              class="c23"
                              id="select-1"
                              type="button"
                            />
                            <div
                              class="c24 c25"
                            >
                              <div
                                class="c26"
                              >
                                <div
                                  class="c27"
                                >
                                  <span
                                    class="c28"
                                    id="select-1-content"
                                  >
                                    Authenticated
                                  </span>
                                </div>
                              </div>
                              <div
                                class="c26"
                              >
                                <button
                                  aria-hidden="true"
                                  class="c29 c30 c31"
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
                          <p
                            class="c32"
                            id="select-1-hint"
                          >
                            It will attach the new authenticated user to the selected role.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c33"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c34"
                      >
                        <div
                          class="c35"
                        >
                          <div
                            class="c36"
                          >
                            <label
                              class="c37"
                              for="field-1"
                            >
                              One account per email address
                            </label>
                          </div>
                          <label
                            class="c38"
                          >
                            <div
                              class="c39"
                            >
                              One account per email address
                            </div>
                            <input
                              class="c40"
                              name="unique_email"
                              type="checkbox"
                            />
                            <div
                              aria-hidden="true"
                              class="c41 c42"
                            >
                              <div
                                class="c43 c44"
                              >
                                <span
                                  class="c45"
                                >
                                  Off
                                </span>
                              </div>
                              <div
                                class="c46 c47"
                              >
                                <span
                                  class="c37"
                                >
                                  On
                                </span>
                              </div>
                            </div>
                          </label>
                          <p
                            class="c48"
                            id="field-1-hint"
                          >
                            Disallow the user to create multiple accounts using the same email address with different authentication providers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c33"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c34"
                      >
                        <div
                          class="c35"
                        >
                          <div
                            class="c36"
                          >
                            <label
                              class="c37"
                              for="field-2"
                            >
                              Enable sign-ups
                            </label>
                          </div>
                          <label
                            class="c38"
                          >
                            <div
                              class="c39"
                            >
                              Enable sign-ups
                            </div>
                            <input
                              class="c40"
                              name="allow_register"
                              type="checkbox"
                            />
                            <div
                              aria-hidden="true"
                              class="c41 c42"
                            >
                              <div
                                class="c43 c44"
                              >
                                <span
                                  class="c45"
                                >
                                  Off
                                </span>
                              </div>
                              <div
                                class="c46 c47"
                              >
                                <span
                                  class="c37"
                                >
                                  On
                                </span>
                              </div>
                            </div>
                          </label>
                          <p
                            class="c48"
                            id="field-2-hint"
                          >
                            When disabled (OFF), the registration process is forbidden. No one can subscribe anymore no matter the used provider.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c49"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c50"
                      >
                        <div>
                          <div
                            class="c51"
                          >
                            <div
                              class="c52"
                            >
                              <label
                                class="c53"
                                for="textinput-1"
                              >
                                Reset password page
                              </label>
                            </div>
                            <div
                              class="c54 c55"
                            >
                              <input
                                aria-describedby="textinput-1-hint"
                                aria-disabled="false"
                                aria-invalid="false"
                                class="c56"
                                id="textinput-1"
                                name="email_reset_password"
                                placeholder="ex: https://youtfrontend.com/reset-password"
                                type="text"
                                value="https://cat-bounce.com/"
                              />
                            </div>
                            <p
                              class="c57"
                              id="textinput-1-hint"
                            >
                              URL of your application's reset password page.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c33"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c34"
                      >
                        <div
                          class="c35"
                        >
                          <div
                            class="c36"
                          >
                            <label
                              class="c37"
                              for="field-3"
                            >
                              Enable email confirmation
                            </label>
                          </div>
                          <label
                            class="c38"
                          >
                            <div
                              class="c39"
                            >
                              Enable email confirmation
                            </div>
                            <input
                              class="c40"
                              name="email_confirmation"
                              type="checkbox"
                            />
                            <div
                              aria-hidden="true"
                              class="c41 c42"
                            >
                              <div
                                class="c43 c44"
                              >
                                <span
                                  class="c45"
                                >
                                  Off
                                </span>
                              </div>
                              <div
                                class="c46 c47"
                              >
                                <span
                                  class="c37"
                                >
                                  On
                                </span>
                              </div>
                            </div>
                          </label>
                          <p
                            class="c48"
                            id="field-3-hint"
                          >
                            When enabled (ON), new registered users receive a confirmation email.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c49"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c50"
                      >
                        <div>
                          <div
                            class="c51"
                          >
                            <div
                              class="c52"
                            >
                              <label
                                class="c53"
                                for="textinput-2"
                              >
                                Redirection url
                              </label>
                            </div>
                            <div
                              class="c54 c58"
                              disabled=""
                            >
                              <input
                                aria-describedby="textinput-2-hint"
                                aria-disabled="true"
                                aria-invalid="false"
                                class="c56"
                                id="textinput-2"
                                name="email_confirmation_redirection"
                                placeholder="ex: https://youtfrontend.com/reset-password"
                                type="text"
                                value=""
                              />
                            </div>
                            <p
                              class="c57"
                              id="textinput-2-hint"
                            >
                              After you confirmed your email, choose where you will be redirected.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    `);
  });
});
