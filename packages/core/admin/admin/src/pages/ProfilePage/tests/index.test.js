import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import ProfilePage from '../index';
import server from './utils/server';

jest.mock('../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale: () => {},
  localeNames: ['en'],
  messages: ['test'],
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useAppInfos: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
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
    <IntlProvider messages={{}} textComponent="span" locale="en">
      <ThemeProvider theme={lightTheme}>
        <ProfilePage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('ADMIN | Pages | Profile page', () => {
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
    const { container } = render(App);
    await waitFor(() => {
      expect(screen.getByText('Interface language')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c16 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c11 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
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

      .c9 {
        height: 100%;
      }

      .c6 {
        padding: 8px 16px;
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

      .c6 .c10 {
        color: #ffffff;
      }

      .c6[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true'] .c10 {
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

      .c6[aria-disabled='true']:active .c10 {
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

      .c31 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c31:focus {
        outline: none;
      }

      .c29 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c36 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c40 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c35 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c38 {
        padding-left: 12px;
      }

      .c32 {
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

      .c34 {
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

      .c28 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c28 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c28 > * + * {
        margin-top: 4px;
      }

      .c30 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .c30:focus-within {
        border: 1px solid #4945ff;
      }

      .c37 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c37 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c37 svg path {
        fill: #666687;
      }

      .c39 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c39 svg {
        width: 0.375rem;
      }

      .c33 {
        min-height: 2.5rem;
      }

      .c15 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c15 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c15 > * + * {
        margin-top: 24px;
      }

      .c17 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c17 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c17 > * + * {
        margin-top: 16px;
      }

      .c18 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c24 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c23 {
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

      .c25 {
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

      .c27 {
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

      .c27::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c26 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
      }

      .c22 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c22 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c22 > * + * {
        margin-top: 4px;
      }

      .c21 textarea {
        height: 5rem;
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

      .c19 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 20px;
      }

      .c20 {
        grid-column: span 6;
        word-break: break-all;
      }

      @media (max-width:68.75rem) {
        .c20 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c20 {
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
                    yolo
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c5 c6"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class="c7 c8 c9"
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
                    class="c10 c11"
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
                <div
                  class="c17"
                >
                  <h2
                    class="c18"
                  >
                    Profile
                  </h2>
                  <div
                    class="c19"
                  >
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-1"
                                >
                                  First name
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-1"
                                  name="firstname"
                                  placeholder=""
                                  type="text"
                                  value="michoko"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-2"
                                >
                                  Last name
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-2"
                                  name="lastname"
                                  placeholder=""
                                  type="text"
                                  value="ronronscelestes"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-3"
                                >
                                  Email
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-3"
                                  name="email"
                                  placeholder=""
                                  type="email"
                                  value="michka@michka.fr"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-4"
                                >
                                  Username
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-4"
                                  name="username"
                                  placeholder=""
                                  type="text"
                                  value="yolo"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c16"
              >
                <div
                  class="c17"
                >
                  <h2
                    class="c18"
                  >
                    Change password
                  </h2>
                  <div
                    class="c19"
                  >
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-5"
                                >
                                  Password
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-5"
                                  name="password"
                                  placeholder=""
                                  type="password"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c22"
                            >
                              <div
                                class="c23"
                              >
                                <label
                                  class="c24"
                                  for="textinput-6"
                                >
                                  Password confirmation
                                </label>
                              </div>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
                                  id="textinput-6"
                                  name="confirmPassword"
                                  placeholder=""
                                  type="password"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c16"
              >
                <div
                  class="c17"
                >
                  <h2
                    class="c18"
                  >
                    Experience
                  </h2>
                  <div>
                    <div
                      class="c28"
                    >
                      <span
                        class="c29"
                        for="select-1"
                        id="select-1-label"
                      >
                        Interface language
                      </span>
                      <div
                        class="c30"
                      >
                        <button
                          aria-describedby="select-1-hint"
                          aria-disabled="false"
                          aria-expanded="false"
                          aria-haspopup="listbox"
                          aria-labelledby="select-1-label select-1-content"
                          class="c31"
                          id="select-1"
                          type="button"
                        />
                        <div
                          class="c32 c33"
                        >
                          <div
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              <span
                                class="c36"
                                id="select-1-content"
                              >
                                Select
                              </span>
                            </div>
                          </div>
                          <div
                            class="c34"
                          >
                            <button
                              aria-disabled="false"
                              aria-label="Clear the interface language selected"
                              class="c37"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M24 2.417L21.583 0 12 9.583 2.417 0 0 2.417 9.583 12 0 21.583 2.417 24 12 14.417 21.583 24 24 21.583 14.417 12 24 2.417z"
                                  fill="#212134"
                                />
                              </svg>
                            </button>
                            <button
                              aria-hidden="true"
                              class="c38 c37 c39"
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
                      <p
                        class="c40"
                        id="select-1-hint"
                      >
                        This will only display your own interface in the chosen language.
                      </p>
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

  it('should display username if it exists', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  test.todo('should display firstname/lastname when the username is null');
});
