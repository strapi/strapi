import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from '@strapi/design-system';
import ProfilePage from '../index';
import server from './utils/server';
import ThemeToggleProvider from '../../../components/ThemeToggleProvider';
import Theme from '../../../components/Theme';

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
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <ProfilePage />
        </Theme>
      </ThemeToggleProvider>
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
      .c13 {
        padding-bottom: 56px;
      }

      .c17 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c11 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
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
        position: relative;
        outline: none;
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

      .c5:after {
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

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c9 {
        height: 100%;
      }

      .c6 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
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

      .c6 svg > g,
      .c6 svg path {
        fill: #ffffff;
      }

      .c34 {
        border: none;
        background: transparent;
        font-size: 1.6rem;
        width: auto;
        padding: 0;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c44 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c44:focus {
        outline: none;
      }

      .c44[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c47 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c50 {
        padding-left: 12px;
      }

      .c39 {
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

      .c42 {
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

      .c45 {
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

      .c41 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c48 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c52 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c40 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c40 > * + * {
        margin-top: 4px;
      }

      .c43 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c43:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c49 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c49 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c49 svg path {
        fill: #666687;
      }

      .c51 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c51 svg {
        width: 0.375rem;
      }

      .c46 {
        width: 100%;
      }

      .c15 {
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

      .c16 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c16 > * + * {
        margin-top: 24px;
      }

      .c18 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c18 > * + * {
        margin-top: 16px;
      }

      .c36 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c36 > * + * {
        margin-top: 4px;
      }

      .c33 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c22 {
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

      .c25 {
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

      .c28 {
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

      .c24 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c26 {
        color: #d02b20;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c27 {
        line-height: 0;
      }

      .c30 {
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

      .c30::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c30::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c30:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c30::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c30[aria-disabled='true'] {
        color: inherit;
      }

      .c30:focus {
        outline: none;
        box-shadow: none;
      }

      .c31 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 0;
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

      .c29 {
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

      .c29:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c23 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c23 > * + * {
        margin-top: 4px;
      }

      .c19 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c37 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c14 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c2 {
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
      }

      .c4 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c12 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c20 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 20px;
      }

      .c21 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c38 {
        color: #4945ff;
      }

      .c32::-ms-reveal {
        display: none;
      }

      .c35 svg {
        height: 1rem;
        width: 1rem;
      }

      .c35 svg path {
        fill: #666687;
      }

      @media (max-width:68.75rem) {
        .c21 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c21 {
          grid-column: span;
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
                class="c12"
              />
            </div>
          </div>
          <div
            class="c13"
          >
            <div
              class="c14"
            >
              <div
                class="c15 c16"
                spacing="6"
              >
                <div
                  class="c17"
                >
                  <div
                    class="c15 c18"
                    spacing="4"
                  >
                    <h2
                      class="c19"
                    >
                      Profile
                    </h2>
                    <div
                      class="c20"
                    >
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="firstname"
                                  required=""
                                >
                                  <div
                                    class="c25"
                                  >
                                    First name
                                    <span
                                      class="c26 c27"
                                    >
                                      *
                                    </span>
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c30"
                                    id="firstname"
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
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="lastname"
                                >
                                  <div
                                    class="c25"
                                  >
                                    Last name
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c30"
                                    id="lastname"
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
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="email"
                                  required=""
                                >
                                  <div
                                    class="c25"
                                  >
                                    Email
                                    <span
                                      class="c26 c27"
                                    >
                                      *
                                    </span>
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c30"
                                    id="email"
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
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="username"
                                >
                                  <div
                                    class="c25"
                                  >
                                    Username
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c30"
                                    id="username"
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
                  class="c17"
                >
                  <div
                    class="c15 c18"
                    spacing="4"
                  >
                    <h2
                      class="c19"
                    >
                      Change password
                    </h2>
                    <div
                      class="c20"
                    >
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="textinput-1"
                                >
                                  <div
                                    class="c25"
                                  >
                                    Current Password
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c31 c32"
                                    id="textinput-1"
                                    name="currentPassword"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c33"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c34 c35"
                                      type="button"
                                    >
                                      <svg
                                        fill="none"
                                        height="1em"
                                        viewBox="0 0 24 24"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M4.048 6.875L2.103 4.93a1 1 0 111.414-1.415l16.966 16.966a1 1 0 11-1.414 1.415l-2.686-2.686a12.247 12.247 0 01-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 01-2.116-2.568 11.096 11.096 0 01-.711-1.211 1.145 1.145 0 010-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906zm10.539 10.539l-1.551-1.551a4.005 4.005 0 01-4.9-4.9L6.584 9.411a6 6 0 008.002 8.002zM7.617 4.787A12.248 12.248 0 0112 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 012.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 00-8.002-8.002L7.617 4.787zm3.347 3.347A4.005 4.005 0 0116 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901z"
                                          fill="#212134"
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
                    <div
                      class="c20"
                    >
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="textinput-2"
                                >
                                  <div
                                    class="c25"
                                  >
                                    Password
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c31 c32"
                                    id="textinput-2"
                                    name="password"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c33"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c34 c35"
                                      type="button"
                                    >
                                      <svg
                                        fill="none"
                                        height="1em"
                                        viewBox="0 0 24 24"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M4.048 6.875L2.103 4.93a1 1 0 111.414-1.415l16.966 16.966a1 1 0 11-1.414 1.415l-2.686-2.686a12.247 12.247 0 01-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 01-2.116-2.568 11.096 11.096 0 01-.711-1.211 1.145 1.145 0 010-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906zm10.539 10.539l-1.551-1.551a4.005 4.005 0 01-4.9-4.9L6.584 9.411a6 6 0 008.002 8.002zM7.617 4.787A12.248 12.248 0 0112 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 012.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 00-8.002-8.002L7.617 4.787zm3.347 3.347A4.005 4.005 0 0116 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901z"
                                          fill="#212134"
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
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c22 c23"
                                spacing="1"
                              >
                                <label
                                  class="c24"
                                  for="textinput-3"
                                >
                                  <div
                                    class="c25"
                                  >
                                    Password confirmation
                                  </div>
                                </label>
                                <div
                                  class="c28 c29"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c31 c32"
                                    id="textinput-3"
                                    name="confirmPassword"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c33"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c34 c35"
                                      type="button"
                                    >
                                      <svg
                                        fill="none"
                                        height="1em"
                                        viewBox="0 0 24 24"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M4.048 6.875L2.103 4.93a1 1 0 111.414-1.415l16.966 16.966a1 1 0 11-1.414 1.415l-2.686-2.686a12.247 12.247 0 01-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 01-2.116-2.568 11.096 11.096 0 01-.711-1.211 1.145 1.145 0 010-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906zm10.539 10.539l-1.551-1.551a4.005 4.005 0 01-4.9-4.9L6.584 9.411a6 6 0 008.002 8.002zM7.617 4.787A12.248 12.248 0 0112 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 012.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 00-8.002-8.002L7.617 4.787zm3.347 3.347A4.005 4.005 0 0116 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901z"
                                          fill="#212134"
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
                  class="c17"
                >
                  <div
                    class="c15 c18"
                    spacing="4"
                  >
                    <div
                      class="c15 c36"
                      spacing="1"
                    >
                      <h2
                        class="c19"
                      >
                        Experience
                      </h2>
                      <span
                        class="c37"
                      >
                        Preference changes will apply only to you. More information is available 
                        <a
                          class="c38"
                          href="https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#locales"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          here
                        </a>
                        .
                      </span>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div
                              class="c39 c40"
                              spacing="1"
                            >
                              <span
                                class="c41"
                                for="select-1"
                                id="select-1-label"
                              >
                                <div
                                  class="c42"
                                >
                                  Interface language
                                </div>
                              </span>
                              <div
                                class="c42 c43"
                              >
                                <button
                                  aria-describedby="select-1-hint"
                                  aria-disabled="false"
                                  aria-expanded="false"
                                  aria-haspopup="listbox"
                                  aria-labelledby="select-1-label select-1-content"
                                  class="c44"
                                  id="select-1"
                                  type="button"
                                />
                                <div
                                  class="c45 c46"
                                >
                                  <div
                                    class="c42"
                                  >
                                    <div
                                      class="c47"
                                    >
                                      <span
                                        class="c48"
                                        id="select-1-content"
                                      >
                                        Select
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    class="c42"
                                  >
                                    <button
                                      aria-disabled="false"
                                      aria-label="Clear the interface language selected"
                                      class="c49"
                                      type="button"
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
                                      class="c50 c49 c51"
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
                                class="c52"
                                id="select-1-hint"
                              >
                                This will only display your own interface in the chosen language.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        class="c21"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div
                              class="c39 c40"
                              spacing="1"
                            >
                              <span
                                class="c41"
                                for="select-2"
                                id="select-2-label"
                              >
                                <div
                                  class="c42"
                                >
                                  Interface mode
                                </div>
                              </span>
                              <div
                                class="c42 c43"
                              >
                                <button
                                  aria-describedby="select-2-hint"
                                  aria-disabled="false"
                                  aria-expanded="false"
                                  aria-haspopup="listbox"
                                  aria-labelledby="select-2-label select-2-content"
                                  class="c44"
                                  id="select-2"
                                  type="button"
                                />
                                <div
                                  class="c45 c46"
                                >
                                  <div
                                    class="c42"
                                  >
                                    <div
                                      class="c47"
                                    >
                                      <span
                                        class="c48"
                                        id="select-2-content"
                                      >
                                        Light mode
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    class="c42"
                                  >
                                    <button
                                      aria-hidden="true"
                                      class="c50 c49 c51"
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
                                class="c52"
                                id="select-2-hint"
                              >
                                Displays your interface in the chosen mode.
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
