import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@strapi/parts/ThemeProvider';
import { lightTheme } from '@strapi/parts/themes';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import * as yup from 'yup';
import { IntlProvider } from 'react-intl';
import ResetPassword from '..';

jest.mock('../../../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale: () => {},
  localeNames: ['en'],
  messages: ['test'],
}));
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => jest.fn({}),
}));

describe('ADMIN | PAGES | AUTH | ResetPassword', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <ResetPassword onSubmit={() => {}} schema={yup.object()} />
          </Router>
        </ThemeProvider>
      </IntlProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c14 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c4 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c18 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c25 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c34 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c36 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c5 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c35 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c3 {
        padding-right: 4px;
      }

      .c6 {
        padding-top: 64px;
        padding-bottom: 64px;
      }

      .c8 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c13 {
        padding-top: 24px;
        padding-bottom: 32px;
      }

      .c22 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c32 {
        padding-top: 16px;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: end;
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c10 {
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

      .c19 {
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

      .c31 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
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
        margin-top: 4px;
      }

      .c21 {
        border: none;
        padding-left: 16px;
        padding-right: 0;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        height: 2.5rem;
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

      .c21:disabled {
        background: inherit;
        color: inherit;
      }

      .c21:focus {
        outline: none;
      }

      .c20 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .c20:focus-within {
        border: 1px solid #4945ff;
      }

      .c16 textarea {
        height: 5rem;
      }

      .c2 {
        border: none;
        background: transparent;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        font-size: 0.75rem;
      }

      .c2 svg {
        height: 0.25rem;
      }

      .c2 svg path {
        fill: #8e8ea9;
      }

      .c33 {
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-transform: uppercase;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c33 svg path {
        fill: #4945ff;
      }

      .c33 svg {
        font-size: 0.625rem;
      }

      .c7 {
        outline: none;
      }

      .c30 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c26 {
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

      .c26 svg {
        height: 12px;
        width: 12px;
      }

      .c26 svg > g,
      .c26 svg path {
        fill: #ffffff;
      }

      .c26[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c27 .c29 {
        color: #ffffff;
      }

      .c27[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true'] .c29 {
        color: #666687;
      }

      .c27[aria-disabled='true'] svg > g,
      .c27[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c27[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true']:active .c29 {
        color: #666687;
      }

      .c27[aria-disabled='true']:active svg > g,
      .c27[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c27:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c27:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c9 {
        margin: 0 auto;
        width: 552px;
      }

      .c11 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c28 {
        display: inline-block;
        width: 100%;
      }

      .c12 {
        height: 4.5rem;
      }

      .c23 {
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

      .c24 svg {
        height: 1rem;
        width: 1rem;
      }

      .c24 svg path {
        fill: #666687;
      }

      <div>
        <header
          class="c0"
        >
          <div
            class="c1"
          >
            <div>
              <button
                aria-controls="simplemenu-1"
                aria-expanded="false"
                aria-haspopup="true"
                class="c2"
                type="button"
              >
                <div
                  class="c3"
                >
                  <span
                    class="c4 c5"
                  />
                </div>
                <svg
                  aria-hidden="true"
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
        </header>
        <div
          class="c6"
        >
          <main
            aria-labelledby="password-forgotten"
            class="c7"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c8 c9"
            >
              <form
                action="#"
                novalidate=""
              >
                <div
                  class="c10 c11"
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    class="c12"
                  />
                  <div
                    class="c13"
                  >
                    <h1
                      class="c14"
                      id="password-forgotten"
                    >
                      Reset password
                    </h1>
                  </div>
                </div>
                <div
                  class="c15"
                >
                  <div
                    class="c16"
                  >
                    <div>
                      <div
                        class="c17"
                      >
                        <div
                          class="c10"
                        >
                          <label
                            class="c18"
                            for="textinput-2"
                          >
                            Password
                          </label>
                        </div>
                        <div
                          class="c19 c20"
                        >
                          <input
                            aria-describedby="textinput-2-hint"
                            aria-invalid="false"
                            class="c21"
                            id="textinput-2"
                            name="password"
                            required=""
                            type="password"
                            value=""
                          />
                          <div
                            class="c22"
                          >
                            <button
                              aria-label="Hide password"
                              class="c23 c24"
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
                        <p
                          class="c25"
                          id="textinput-2-hint"
                        >
                          Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c16"
                  >
                    <div>
                      <div
                        class="c17"
                      >
                        <div
                          class="c10"
                        >
                          <label
                            class="c18"
                            for="textinput-3"
                          >
                            Confirmation Password
                          </label>
                        </div>
                        <div
                          class="c19 c20"
                        >
                          <input
                            aria-invalid="false"
                            class="c21"
                            id="textinput-3"
                            name="confirmPassword"
                            required=""
                            type="password"
                            value=""
                          />
                          <div
                            class="c22"
                          >
                            <button
                              aria-label="Hide password"
                              class="c23 c24"
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
                  <button
                    aria-disabled="false"
                    class="c26 c27 c28"
                    type="submit"
                  >
                    <span
                      class="c29 c30"
                    >
                      Change password
                    </span>
                  </button>
                </div>
              </form>
            </div>
            <div
              class="c31"
            >
              <div
                class="c32"
              >
                <a
                  class="c33"
                  href="/auth/login"
                >
                  <span
                    class="c34 c5 c35"
                  >
                    <span
                      class="c36"
                    >
                      Ready to sign in?
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });
});
