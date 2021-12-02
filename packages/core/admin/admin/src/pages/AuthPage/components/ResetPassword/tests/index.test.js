import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@strapi/design-system/ThemeProvider';
import { lightTheme } from '@strapi/design-system/themes';
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
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <ResetPassword onSubmit={() => {}} schema={yup.object()} />
          </Router>
        </ThemeProvider>
      </IntlProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c9 {
        padding-top: 64px;
        padding-bottom: 64px;
      }

      .c11 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c16 {
        padding-top: 24px;
        padding-bottom: 32px;
      }

      .c37 {
        padding-top: 16px;
      }

      .c35 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c32 {
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

      .c32 svg {
        height: 12px;
        width: 12px;
      }

      .c32 svg > g,
      .c32 svg path {
        fill: #ffffff;
      }

      .c32[aria-disabled='true'] {
        pointer-events: none;
      }

      .c32:after {
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

      .c32:focus-visible {
        outline: none;
      }

      .c32:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c33 {
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

      .c33 .sc-eCImPb {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c33 .c34 {
        color: #ffffff;
      }

      .c33[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c33[aria-disabled='true'] .c34 {
        color: #666687;
      }

      .c33[aria-disabled='true'] svg > g,
      .c33[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c33[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c33[aria-disabled='true']:active .c34 {
        color: #666687;
      }

      .c33[aria-disabled='true']:active svg > g,
      .c33[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c33:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c33:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c29 {
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

      .c13 {
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

      .c36 {
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

      .c18 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c18 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c18 > * + * {
        margin-top: 24px;
      }

      .c21 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c22 {
        color: #d02b20;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c31 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c23 {
        line-height: 0;
      }

      .c28 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c20 {
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
        padding-right: 0;
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

      .c19 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c19 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c19 > * + * {
        margin-top: 4px;
      }

      .c17 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c10:focus-visible {
        outline: none;
      }

      .c39 {
        color: #4945ff;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c38 {
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
        position: relative;
        outline: none;
      }

      .c38 svg path {
        fill: #4945ff;
      }

      .c38 svg {
        font-size: 0.625rem;
      }

      .c38:after {
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

      .c38:focus-visible {
        outline: none;
      }

      .c38:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c5 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c7 {
        padding-left: 8px;
      }

      .c2 {
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

      .c2 svg {
        height: 12px;
        width: 12px;
      }

      .c2 svg > g,
      .c2 svg path {
        fill: #ffffff;
      }

      .c2[aria-disabled='true'] {
        pointer-events: none;
      }

      .c2:after {
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

      .c2:focus-visible {
        outline: none;
      }

      .c2:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid transparent;
        background: transparent;
      }

      .c3 .c6 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c3 .c4 {
        color: #ffffff;
      }

      .c3[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c3[aria-disabled='true'] .c4 {
        color: #666687;
      }

      .c3[aria-disabled='true'] svg > g,
      .c3[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c3[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c3[aria-disabled='true']:active .c4 {
        color: #666687;
      }

      .c3[aria-disabled='true']:active svg > g,
      .c3[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c3:hover {
        background-color: #f6f6f9;
      }

      .c3:active {
        border: 1px solid undefined;
        background: undefined;
      }

      .c3 .c4 {
        color: #32324d;
      }

      .c3 svg > g,
      .c3 svg path {
        fill: #8e8ea9;
      }

      .c8 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c8 svg {
        height: 4px;
        width: 6px;
      }

      .c12 {
        margin: 0 auto;
        width: 552px;
      }

      .c14 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c15 {
        height: 4.5rem;
      }

      .c30 svg {
        height: 1rem;
        width: 1rem;
      }

      .c30 svg path {
        fill: #666687;
      }

      .c27::-ms-reveal {
        display: none;
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
                aria-disabled="false"
                aria-expanded="false"
                aria-haspopup="true"
                class="c2 c3"
                type="button"
              >
                <span
                  class="c4 c5"
                />
                <div
                  aria-hidden="true"
                  class="c6 c7"
                >
                  <span
                    class="c8"
                  >
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
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>
        <div
          class="c9"
        >
          <main
            aria-labelledby="main-content-title"
            class="c10"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c11 c12"
            >
              <form
                action="#"
                novalidate=""
              >
                <div
                  class="c13 c14"
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    class="c15"
                  />
                  <div
                    class="c16"
                  >
                    <h1
                      class="c17"
                    >
                      Reset password
                    </h1>
                  </div>
                </div>
                <div
                  class="c18"
                >
                  <div>
                    <div>
                      <div
                        class="c19"
                      >
                        <div
                          class="c20"
                        >
                          <label
                            class="c21"
                            for="textinput-1"
                            required=""
                          >
                            Password
                            <span
                              class="c22 c23"
                            >
                              *
                            </span>
                          </label>
                        </div>
                        <div
                          class="c24 c25"
                        >
                          <input
                            aria-describedby="textinput-1-hint"
                            aria-disabled="false"
                            aria-invalid="false"
                            class="c26 c27"
                            id="textinput-1"
                            name="password"
                            type="password"
                            value=""
                          />
                          <div
                            class="c28"
                          >
                            <button
                              aria-label="Hide password"
                              class="c29 c30"
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
                          class="c31"
                          id="textinput-1-hint"
                        >
                          Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div>
                      <div
                        class="c19"
                      >
                        <div
                          class="c20"
                        >
                          <label
                            class="c21"
                            for="textinput-2"
                            required=""
                          >
                            Confirmation Password
                            <span
                              class="c22 c23"
                            >
                              *
                            </span>
                          </label>
                        </div>
                        <div
                          class="c24 c25"
                        >
                          <input
                            aria-disabled="false"
                            aria-invalid="false"
                            class="c26 c27"
                            id="textinput-2"
                            name="confirmPassword"
                            type="password"
                            value=""
                          />
                          <div
                            class="c28"
                          >
                            <button
                              aria-label="Hide password"
                              class="c29 c30"
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
                    class="c32 c33"
                    type="submit"
                  >
                    <span
                      class="c34 c35"
                    >
                      Change password
                    </span>
                  </button>
                </div>
              </form>
            </div>
            <div
              class="c36"
            >
              <div
                class="c37"
              >
                <a
                  class="c38"
                  href="/auth/login"
                >
                  <span
                    class="c39"
                  >
                    Ready to sign in?
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
