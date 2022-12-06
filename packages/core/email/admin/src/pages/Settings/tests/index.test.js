import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
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
      expect(screen.getByText('Recipient email')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c2 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c8 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c11 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c25 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c27 {
        padding-left: 12px;
      }

      .c35 {
        padding-right: 8px;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
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
      }

      .c4 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c9 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c6 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c7 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c14 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c15 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c19 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c26 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #666687;
      }

      .c37 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c10 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c10 > * + * {
        margin-top: 32px;
      }

      .c12 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c12 > * + * {
        margin-top: 16px;
      }

      .c13 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c13 > * + * {
        margin-top: 4px;
      }

      .c33 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        outline: none;
      }

      .c33 svg {
        height: 12px;
        width: 12px;
      }

      .c33 svg > g,
      .c33 svg path {
        fill: #ffffff;
      }

      .c33[aria-disabled='true'] {
        pointer-events: none;
      }

      .c33:after {
        -webkit-transition-property: all;
        transition-property: all;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -4px;
        bottom: -4px;
        left: -4px;
        right: -4px;
        border: 2px solid transparent;
      }

      .c33:focus-visible {
        outline: none;
      }

      .c33:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c36 {
        height: 100%;
      }

      .c34 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
      }

      .c34 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c34 .c5 {
        color: #ffffff;
      }

      .c34[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c34[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c34[aria-disabled='true'] svg > g,.c34[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c34[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c34[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c34[aria-disabled='true']:active svg > g,.c34[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c34:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c34:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c34 svg > g,
      .c34 svg path {
        fill: #ffffff;
      }

      .c21 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 0.65625rem;
        cursor: not-allowed;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c21::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c21::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c21:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c21::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c21[aria-disabled='true'] {
        color: inherit;
      }

      .c21:focus {
        outline: none;
        box-shadow: none;
      }

      .c31 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 0.65625rem;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c31::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c31::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c31:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c31::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c31[aria-disabled='true'] {
        color: inherit;
      }

      .c31:focus {
        outline: none;
        box-shadow: none;
      }

      .c20 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        color: #666687;
        background: #eaeaef;
      }

      .c20:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c30 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c30:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
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

      .c23[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c22 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2.5rem;
        color: #666687;
        background: #eaeaef;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c22:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c28 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c28 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c28 svg path {
        fill: #666687;
      }

      .c29 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
        cursor: not-allowed;
      }

      .c29 svg {
        width: 0.375rem;
      }

      .c24 {
        width: 100%;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c17 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 20px;
      }

      .c18 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c32 {
        grid-column: span 7;
        max-width: 100%;
      }

      .c16 {
        color: #4945ff;
      }

      @media (max-width:68.75rem) {
        .c18 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c18 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c32 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c32 {
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
            class="c1 c2"
            data-strapi-header="true"
          >
            <div
              class="c1 c3"
            >
              <div
                class="c1 c4"
              >
                <h1
                  class="c5 c6"
                  id="title"
                >
                  Configuration
                </h1>
              </div>
            </div>
            <p
              class="c5 c7"
            >
              Test the settings for the Email plugin
            </p>
          </div>
        </div>
        <div
          class="c1 c8"
        >
          <form>
            <div
              class="c1 c9 c10"
              spacing="7"
            >
              <div
                class="c1 c11"
              >
                <div
                  class="c1 c9 c12"
                  spacing="4"
                >
                  <div
                    class="c1 c9 c13"
                    spacing="1"
                  >
                    <h2
                      class="c5 c14"
                    >
                      Configuration
                    </h2>
                    <span
                      class="c5 c15"
                    >
                      The plugin is configured through the ./config/plugins.js file, checkout this 
                      <a
                        class="c16"
                        href="https://docs.strapi.io/developer-docs/latest/plugins/email.html"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Link
                      </a>
                       for the documentation.
                    </span>
                  </div>
                  <div
                    class="c1 c17"
                  >
                    <div
                      class="c18"
                    >
                      <div
                        class="c1 "
                      >
                        <div>
                          <div>
                            <div
                              class="c1 c9 c13"
                              spacing="1"
                            >
                              <label
                                class="c5 c19"
                                for="textinput-4"
                              >
                                <div
                                  class="c1 c4"
                                >
                                  Default sender email
                                </div>
                              </label>
                              <div
                                class="c1 c3 c20"
                                disabled=""
                              >
                                <input
                                  aria-disabled="true"
                                  aria-invalid="false"
                                  class="c21"
                                  id="textinput-4"
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
                      class="c18"
                    >
                      <div
                        class="c1 "
                      >
                        <div>
                          <div>
                            <div
                              class="c1 c9 c13"
                              spacing="1"
                            >
                              <label
                                class="c5 c19"
                                for="textinput-5"
                              >
                                <div
                                  class="c1 c4"
                                >
                                  Default response email
                                </div>
                              </label>
                              <div
                                class="c1 c3 c20"
                                disabled=""
                              >
                                <input
                                  aria-disabled="true"
                                  aria-invalid="false"
                                  class="c21"
                                  id="textinput-5"
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
                      class="c18"
                    >
                      <div
                        class="c1 "
                      >
                        <div>
                          <div
                            class="c1 c9 c13"
                            spacing="1"
                          >
                            <span
                              class="c5 c19"
                              for="select-6"
                              id="select-6-label"
                            >
                              <div
                                class="c1 c4"
                              >
                                Email provider
                              </div>
                            </span>
                            <div
                              class="c1 c4 c22"
                              disabled=""
                            >
                              <button
                                aria-disabled="true"
                                aria-expanded="false"
                                aria-haspopup="listbox"
                                aria-labelledby="select-6-label select-6-content"
                                class="c23"
                                id="select-6"
                                name="email-provider"
                                type="button"
                              />
                              <div
                                class="c1 c3 c24"
                              >
                                <div
                                  class="c1 c4"
                                >
                                  <div
                                    class="c1 c25"
                                  >
                                    <span
                                      class="c5 c26"
                                      id="select-6-content"
                                    >
                                      Select...
                                    </span>
                                  </div>
                                </div>
                                <div
                                  class="c1 c4"
                                >
                                  
                                  <button
                                    aria-hidden="true"
                                    class="c1 c27 c28 c29"
                                    disabled=""
                                    tabindex="-1"
                                    title="Carret Down Button"
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
                class="c1 c11"
              >
                <div
                  class="c1 c9 c12"
                  spacing="4"
                >
                  <h2
                    class="c5 c14"
                  >
                    Test email delivery
                  </h2>
                  <div
                    class="c1 c17"
                  >
                    <div
                      class="c18"
                    >
                      <div
                        class="c1 "
                      >
                        <div>
                          <div>
                            <div
                              class="c1 c9 c13"
                              spacing="1"
                            >
                              <label
                                class="c5 c19"
                                for="test-address-input"
                              >
                                <div
                                  class="c1 c4"
                                >
                                  Recipient email
                                </div>
                              </label>
                              <div
                                class="c1 c3 c30"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c31"
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
                      class="c32"
                    >
                      <div
                        class="c1 "
                      >
                        <button
                          aria-disabled="true"
                          class="c33 c34"
                          disabled=""
                          type="submit"
                        >
                          <div
                            aria-hidden="true"
                            class="c1 c35 c36"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 2.8A.8.8 0 01.8 2h22.4a.8.8 0 01.8.8v2.71a1 1 0 01-1 1H1a1 1 0 01-1-1V2.8z"
                                fill="#32324D"
                              />
                              <path
                                d="M1.922 7.991C.197 6.675 0 6.252 0 5.289h23.953c.305 1.363-1.594 2.506-2.297 3.125-1.953 1.363-6.253 4.36-7.828 5.45-1.575 1.09-3.031.455-3.562 0-2.063-1.41-6.62-4.557-8.344-5.873zM22.8 18H1.2c-.663 0-1.2.471-1.2 1.053v1.894C0 21.529.537 22 1.2 22h21.6c.663 0 1.2-.471 1.2-1.053v-1.894c0-.582-.537-1.053-1.2-1.053z"
                                fill="#32324D"
                              />
                              <path
                                d="M0 9.555v10.972h24V9.554c-2.633 1.95-8.367 6.113-9.96 7.166-1.595 1.052-3.352.438-4.032 0L0 9.555z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                          <span
                            class="c5 c37"
                          >
                            Send test email
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
