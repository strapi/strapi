import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import * as yup from 'yup';
import { IntlProvider } from 'react-intl';
import ResetPassword from '..';

jest.mock('../../../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale() {},
  localeNames: { en: 'English' },
  messages: ['test'],
}));
jest.mock('../../../../../hooks/useConfigurations', () => () => ({
  logos: {
    auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
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

      .c2 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c10 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c12 {
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

      .c28 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c29 {
        background: transparent;
        border-style: none;
      }

      .c37 {
        padding-top: 16px;
      }

      .c7 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c17 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c20 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c22 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #d02b20;
      }

      .c34 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c0 {
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
        -webkit-box-pack: end;
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
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
        gap: 8px;
      }

      .c8 {
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

      .c18 {
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
        gap: 24px;
      }

      .c19 {
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
        gap: 4px;
      }

      .c24 {
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

      .c30 {
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
        -webkit-box-pack: unset;
        -webkit-justify-content: unset;
        -ms-flex-pack: unset;
        justify-content: unset;
      }

      .c36 {
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c4 {
        position: relative;
        outline: none;
      }

      .c4 > svg {
        height: 12px;
        width: 12px;
      }

      .c4 > svg > g,
      .c4 > svg path {
        fill: #ffffff;
      }

      .c4[aria-disabled='true'] {
        pointer-events: none;
      }

      .c4:after {
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

      .c4:focus-visible {
        outline: none;
      }

      .c4:focus-visible:after {
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

      .c5 {
        height: 2rem;
        border: 1px solid transparent;
        background: transparent;
      }

      .c5[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c5[aria-disabled='true'] .c6 {
        color: #666687;
      }

      .c5[aria-disabled='true'] svg > g,.c5[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c5[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c5[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c5[aria-disabled='true']:active svg > g,.c5[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c5:hover {
        background-color: #f6f6f9;
      }

      .c5:active {
        border: 1px solid undefined;
        background: undefined;
      }

      .c5 .c6 {
        color: #32324d;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #8e8ea9;
      }

      .c35 {
        height: 2rem;
      }

      .c35[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c35[aria-disabled='true'] .c6 {
        color: #666687;
      }

      .c35[aria-disabled='true'] svg > g,.c35[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c35[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c35[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c35[aria-disabled='true']:active svg > g,.c35[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c35:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c35:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c35 svg > g,
      .c35 svg path {
        fill: #ffffff;
      }

      .c21 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c23 {
        line-height: 0;
      }

      .c26 {
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

      .c9 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c9 svg {
        height: 4px;
        width: 6px;
      }

      .c31 {
        font-size: 1.6rem;
        padding: 0;
      }

      .c11:focus-visible {
        outline: none;
      }

      .c39 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
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
        -webkit-text-decoration: none;
        text-decoration: none;
        gap: 8px;
        position: relative;
        outline: none;
      }

      .c38 svg {
        font-size: 0.625rem;
      }

      .c38 svg path {
        fill: #4945ff;
      }

      .c38:hover {
        color: #7b79ff;
      }

      .c38:active {
        color: #271fe0;
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

      .c13 {
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

      .c32 svg {
        height: 1rem;
        width: 1rem;
      }

      .c32 svg path {
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
                aria-controls="0"
                aria-disabled="false"
                aria-expanded="false"
                aria-haspopup="true"
                class="c2 c3 c4 c5"
                label="English"
                type="button"
              >
                <span
                  class="c6 c7"
                >
                  English
                </span>
                <div
                  aria-hidden="true"
                  class="c8"
                >
                  <span
                    class="c9"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="1rem"
                      viewBox="0 0 14 8"
                      width="1rem"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        clip-rule="evenodd"
                        d="M14 .889a.86.86 0 0 1-.26.625L7.615 7.736A.834.834 0 0 1 7 8a.834.834 0 0 1-.615-.264L.26 1.514A.861.861 0 0 1 0 .889c0-.24.087-.45.26-.625A.834.834 0 0 1 .875 0h12.25c.237 0 .442.088.615.264a.86.86 0 0 1 .26.625Z"
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
          class="c10"
        >
          <main
            aria-labelledby="main-content-title"
            class="c11"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c12 c13"
            >
              <form
                action="#"
                novalidate=""
              >
                <div
                  class="c8 c14"
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    class="c15"
                    src="customAuthLogo.png"
                  />
                  <div
                    class="c16"
                  >
                    <h1
                      class="c6 c17"
                    >
                      Reset password
                    </h1>
                  </div>
                </div>
                <div
                  class="c18"
                >
                  <div>
                    <div
                      class=""
                    >
                      <div
                        class="c19"
                      >
                        <label
                          class="c6 c20 c21"
                          for="2"
                        >
                          Password
                          <span
                            class="c6 c22 c23"
                          >
                            *
                          </span>
                        </label>
                        <div
                          class="c24 c25"
                        >
                          <input
                            aria-describedby="2-hint"
                            aria-disabled="false"
                            aria-invalid="false"
                            aria-required="true"
                            class="c26 c27"
                            id="2"
                            name="password"
                            type="password"
                            value=""
                          />
                          <div
                            class="c28"
                          >
                            <button
                              class="c29 c30 c31 c32"
                              type="button"
                            >
                              <span
                                class="c33"
                              >
                                Hide password
                              </span>
                              <svg
                                aria-hidden="true"
                                fill="none"
                                focusable="false"
                                height="1rem"
                                viewBox="0 0 24 24"
                                width="1rem"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.048 6.875 2.103 4.93a1 1 0 1 1 1.414-1.415l16.966 16.966a1 1 0 1 1-1.414 1.415l-2.686-2.686a12.247 12.247 0 0 1-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 0 1-2.116-2.568 11.096 11.096 0 0 1-.711-1.211 1.145 1.145 0 0 1 0-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906Zm10.539 10.539-1.551-1.551a4.005 4.005 0 0 1-4.9-4.9L6.584 9.411a6 6 0 0 0 8.002 8.002ZM7.617 4.787A12.248 12.248 0 0 1 12 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 0 1 2.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 0 0-8.002-8.002L7.617 4.787Zm3.347 3.347A4.005 4.005 0 0 1 16 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901Z"
                                  fill="#212134"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p
                          class="c6 c34"
                          id="2-hint"
                        >
                          Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      class=""
                    >
                      <div
                        class="c19"
                      >
                        <label
                          class="c6 c20 c21"
                          for="4"
                        >
                          Confirm Password
                          <span
                            class="c6 c22 c23"
                          >
                            *
                          </span>
                        </label>
                        <div
                          class="c24 c25"
                        >
                          <input
                            aria-disabled="false"
                            aria-invalid="false"
                            aria-required="true"
                            class="c26 c27"
                            id="4"
                            name="confirmPassword"
                            type="password"
                            value=""
                          />
                          <div
                            class="c28"
                          >
                            <button
                              class="c29 c30 c31 c32"
                              type="button"
                            >
                              <span
                                class="c33"
                              >
                                Hide password
                              </span>
                              <svg
                                aria-hidden="true"
                                fill="none"
                                focusable="false"
                                height="1rem"
                                viewBox="0 0 24 24"
                                width="1rem"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.048 6.875 2.103 4.93a1 1 0 1 1 1.414-1.415l16.966 16.966a1 1 0 1 1-1.414 1.415l-2.686-2.686a12.247 12.247 0 0 1-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 0 1-2.116-2.568 11.096 11.096 0 0 1-.711-1.211 1.145 1.145 0 0 1 0-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906Zm10.539 10.539-1.551-1.551a4.005 4.005 0 0 1-4.9-4.9L6.584 9.411a6 6 0 0 0 8.002 8.002ZM7.617 4.787A12.248 12.248 0 0 1 12 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 0 1 2.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 0 0-8.002-8.002L7.617 4.787Zm3.347 3.347A4.005 4.005 0 0 1 16 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901Z"
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
                    class="c2 c3 c4 c35"
                    type="submit"
                  >
                    <span
                      class="c6 c7"
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
