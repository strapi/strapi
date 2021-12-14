import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
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
      .c13 {
        padding-bottom: 56px;
      }

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

      .c30 {
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

      .c38 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c38:focus {
        outline: none;
      }

      .c38[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c35 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c42 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c46 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c41 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c44 {
        padding-left: 12px;
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

      .c39 {
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
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c34 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c34 > * + * {
        margin-top: 4px;
      }

      .c37 {
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

      .c37:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c43 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c43 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c43 svg path {
        fill: #666687;
      }

      .c45 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c45 svg {
        width: 0.375rem;
      }

      .c40 {
        width: 100%;
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

      .c32 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c32 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c32 > * + * {
        margin-top: 4px;
      }

      .c23 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c29 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c22 {
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
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
      }

      .c26::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c26:focus {
        outline: none;
        box-shadow: none;
      }

      .c27 {
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 0;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
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

      .c27:focus {
        outline: none;
        box-shadow: none;
      }

      .c25 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c25:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c21 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c21 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c21 > * + * {
        margin-top: 4px;
      }

      .c18 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c33 {
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

      .c19 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 20px;
      }

      .c20 {
        grid-column: span 6;
      }

      .c28::-ms-reveal {
        display: none;
      }

      .c31 svg {
        height: 1rem;
        width: 1rem;
      }

      .c31 svg path {
        fill: #666687;
      }

      @media (max-width:68.75rem) {
        .c20 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c20 {
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
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="firstname"
                                  >
                                    First name
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c26"
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
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="lastname"
                                  >
                                    Last name
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c26"
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
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="email"
                                  >
                                    Email
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c26"
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
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="username"
                                  >
                                    Username
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c26"
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
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="textinput-1"
                                  >
                                    Current Password
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c27 c28"
                                    id="textinput-1"
                                    name="currentPassword"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c29"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c30 c31"
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
                      class="c19"
                    >
                      <div
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="textinput-2"
                                  >
                                    Password
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c27 c28"
                                    id="textinput-2"
                                    name="password"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c29"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c30 c31"
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
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div>
                              <div
                                class="c21"
                              >
                                <div
                                  class="c22"
                                >
                                  <label
                                    class="c23"
                                    for="textinput-3"
                                  >
                                    Password confirmation
                                  </label>
                                </div>
                                <div
                                  class="c24 c25"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c27 c28"
                                    id="textinput-3"
                                    name="confirmPassword"
                                    type="password"
                                    value=""
                                  />
                                  <div
                                    class="c29"
                                  >
                                    <button
                                      aria-label="Hide password"
                                      class="c30 c31"
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
                  class="c16"
                >
                  <div
                    class="c17"
                  >
                    <div
                      class="c32"
                    >
                      <h2
                        class="c18"
                      >
                        Experience
                      </h2>
                      <span
                        class="c33"
                      >
                        Selection will change the interface language only for you. Please refer to this 
                        <a
                          href="https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#locales"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          documentation
                        </a>
                         to make other languages available for your team.
                      </span>
                    </div>
                    <div
                      class="c19"
                    >
                      <div
                        class="c20"
                      >
                        <div
                          class=""
                        >
                          <div>
                            <div
                              class="c34"
                            >
                              <span
                                class="c35"
                                for="select-1"
                                id="select-1-label"
                              >
                                Interface language
                              </span>
                              <div
                                class="c36 c37"
                              >
                                <button
                                  aria-describedby="select-1-hint"
                                  aria-disabled="false"
                                  aria-expanded="false"
                                  aria-haspopup="listbox"
                                  aria-labelledby="select-1-label select-1-content"
                                  class="c38"
                                  id="select-1"
                                  type="button"
                                />
                                <div
                                  class="c39 c40"
                                >
                                  <div
                                    class="c36"
                                  >
                                    <div
                                      class="c41"
                                    >
                                      <span
                                        class="c42"
                                        id="select-1-content"
                                      >
                                        Select
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    class="c36"
                                  >
                                    <button
                                      aria-disabled="false"
                                      aria-label="Clear the interface language selected"
                                      class="c43"
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
                                      class="c44 c43 c45"
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
                                class="c46"
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
