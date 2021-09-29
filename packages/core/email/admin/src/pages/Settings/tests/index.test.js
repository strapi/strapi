import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import server from './utils/server';
import ProtectedSettingsPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useOverlayBlocker: jest.fn(() => ({
    lockApp: jest.fn(),
    unlockApp: jest.fn(),
  })),
}));

const App = (
  <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
    <ThemeProvider theme={lightTheme}>
      <ProtectedSettingsPage />
    </ThemeProvider>
  </IntlProvider>
);

describe('Email | Pages | Settings', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => {
    server.close();
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot', async () => {
    const { container } = render(App);

    await waitFor(() => {
      expect(screen.getByText('Test delivery email address')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c9 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c43 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c40 {
        padding-right: 8px;
      }

      .c37 {
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

      .c37 svg {
        height: 12px;
        width: 12px;
      }

      .c37 svg > g,
      .c37 svg path {
        fill: #ffffff;
      }

      .c37[aria-disabled='true'] {
        pointer-events: none;
      }

      .c41 {
        height: 100%;
      }

      .c38 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c38 .c39 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c38 .c42 {
        color: #ffffff;
      }

      .c38[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c38[aria-disabled='true'] .c42 {
        color: #666687;
      }

      .c38[aria-disabled='true'] svg > g,
      .c38[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c38[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c38[aria-disabled='true']:active .c42 {
        color: #666687;
      }

      .c38[aria-disabled='true']:active svg > g,
      .c38[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c38:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c38:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c26 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c26:focus {
        outline: none;
      }

      .c24 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c31 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c30 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c32 {
        padding-left: 12px;
      }

      .c27 {
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

      .c29 {
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

      .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c23 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c23 > * + * {
        margin-top: 4px;
      }

      .c25 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        color: #666687;
        background: #eaeaef;
      }

      .c25:focus-within {
        border: 1px solid #4945ff;
      }

      .c33 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c33 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c33 svg path {
        fill: #666687;
      }

      .c34 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c34 svg {
        width: 0.375rem;
      }

      .c28 {
        min-height: 2.5rem;
      }

      .c8 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c8 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c8 > * + * {
        margin-top: 32px;
      }

      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c10 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c10 > * + * {
        margin-top: 16px;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c11 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c11 > * + * {
        margin-top: 4px;
      }

      .c12 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c13 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c19 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c18 {
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

      .c22 {
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

      .c22::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c22::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c22:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c22::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c22[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c21 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        color: #666687;
        background: #eaeaef;
      }

      .c35 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
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
        margin-top: 4px;
      }

      .c16 textarea {
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

      .c7 {
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

      .c5 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c6 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c14 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 20px;
      }

      .c15 {
        grid-column: span 6;
      }

      .c36 {
        grid-column: span 7;
      }

      @media (max-width:68.75rem) {
        .c15 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c15 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c36 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c36 {
          grid-column: span;
        }
      }

      <main
        aria-busy="false"
        aria-labelledby="title"
        class="c0"
        id="main-content"
        tabindex="-1"
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
                  id="title"
                >
                  Email settings
                </h1>
              </div>
            </div>
            <p
              class="c5 c6"
            >
              Test the settings for the email plugin
            </p>
          </div>
        </div>
        <div
          class="c7"
        >
          <form>
            <div
              class="c8"
            >
              <div
                class="c9"
              >
                <div
                  class="c10"
                >
                  <div
                    class="c11"
                  >
                    <h2
                      class="c12"
                    >
                      Configuration
                    </h2>
                    <span
                      class="c13"
                    >
                      Configuration
                    </span>
                  </div>
                  <div
                    class="c14"
                  >
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c16"
                        >
                          <div>
                            <div
                              class="c17"
                            >
                              <div
                                class="c18"
                              >
                                <label
                                  class="c19"
                                  for="textinput-3"
                                >
                                  Default shipper email
                                </label>
                              </div>
                              <div
                                class="c20 c21"
                                disabled=""
                              >
                                <input
                                  aria-disabled="true"
                                  aria-invalid="false"
                                  class="c22"
                                  id="textinput-3"
                                  name="shipper-email"
                                  placeholder="ex: Strapi No-Reply <no-reply@strapi.io>"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c16"
                        >
                          <div>
                            <div
                              class="c17"
                            >
                              <div
                                class="c18"
                              >
                                <label
                                  class="c19"
                                  for="textinput-4"
                                >
                                  Default response email
                                </label>
                              </div>
                              <div
                                class="c20 c21"
                                disabled=""
                              >
                                <input
                                  aria-disabled="true"
                                  aria-invalid="false"
                                  class="c22"
                                  id="textinput-4"
                                  name="response-email"
                                  placeholder="ex: Strapi <example@strapi.io>"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <div>
                          <div
                            class="c23"
                          >
                            <span
                              class="c24"
                              for="select-2"
                              id="select-2-label"
                            >
                              Email provider
                            </span>
                            <div
                              class="c25"
                              disabled=""
                            >
                              <button
                                aria-disabled="true"
                                aria-expanded="false"
                                aria-haspopup="listbox"
                                aria-labelledby="select-2-label select-2-content"
                                class="c26"
                                id="select-2"
                                name="email-provider"
                                type="button"
                              />
                              <div
                                class="c27 c28"
                              >
                                <div
                                  class="c29"
                                >
                                  <div
                                    class="c30"
                                  >
                                    <span
                                      class="c31"
                                      id="select-2-content"
                                    >
                                      Select...
                                    </span>
                                  </div>
                                </div>
                                <div
                                  class="c29"
                                >
                                  
                                  <button
                                    aria-hidden="true"
                                    class="c32 c33 c34"
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10"
                >
                  <h2
                    class="c12"
                  >
                    Send a test mail
                  </h2>
                  <div
                    class="c14"
                  >
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c16"
                        >
                          <div>
                            <div
                              class="c17"
                            >
                              <div
                                class="c18"
                              >
                                <label
                                  class="c19"
                                  for="test-address-input"
                                >
                                  Test delivery email address
                                </label>
                              </div>
                              <div
                                class="c20 c35"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c22"
                                  id="test-address-input"
                                  name="test-address"
                                  placeholder="ex: developer@example.com"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c36"
                    >
                      <div
                        class=""
                      >
                        <button
                          aria-disabled="false"
                          class="c37 c38"
                          type="submit"
                        >
                          <div
                            aria-hidden="true"
                            class="c39 c40 c41"
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
                            class="c42 c43"
                          >
                            Test email
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    `);
  });
});
