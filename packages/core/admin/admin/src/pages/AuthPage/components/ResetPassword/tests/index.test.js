import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import * as yup from 'yup';

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
      .c36 {
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

      .c9 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c21 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c23 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c25 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #d02b20;
      }

      .c37 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c42 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c3 {
        background: #ffffff;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        width: 100%;
        cursor: default;
      }

      .c6 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c13 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c15 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c20 {
        padding-top: 24px;
        padding-bottom: 32px;
      }

      .c31 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c32 {
        background: transparent;
        border-style: none;
      }

      .c38 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c44 {
        padding-top: 16px;
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

      .c2 {
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
        gap: 16px;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c7 {
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
        gap: 12px;
      }

      .c17 {
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
        gap: 24px;
      }

      .c27 {
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

      .c33 {
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

      .c39 {
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

      .c43 {
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

      .c40 {
        position: relative;
        outline: none;
      }

      .c40 > svg {
        height: 12px;
        width: 12px;
      }

      .c40 > svg > g,
      .c40 > svg path {
        fill: #ffffff;
      }

      .c40[aria-disabled='true'] {
        pointer-events: none;
      }

      .c40:after {
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

      .c40:focus-visible {
        outline: none;
      }

      .c40:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c41 {
        height: 2rem;
      }

      .c41 svg {
        height: 0.75rem;
        width: auto;
      }

      .c41[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c41[aria-disabled='true'] .c8 {
        color: #666687;
      }

      .c41[aria-disabled='true'] svg > g,.c41[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c41[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c41[aria-disabled='true']:active .c8 {
        color: #666687;
      }

      .c41[aria-disabled='true']:active svg > g,.c41[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c41:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c41:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c41 svg > g,
      .c41 svg path {
        fill: #ffffff;
      }

      .c24 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c26 {
        line-height: 0;
      }

      .c5 {
        border: 1px solid #dcdce4;
        min-height: 2.5rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c5[aria-disabled='true'] {
        color: #666687;
      }

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c12 > svg {
        width: 0.375rem;
      }

      .c12 > svg > path {
        fill: #666687;
      }

      .c10 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c47[data-state='checked'] .c8 {
        font-weight: bold;
        color: #4945ff;
      }

      .c29 {
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

      .c29::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c29::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c29:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c29::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c29[aria-disabled='true'] {
        color: inherit;
      }

      .c29:focus {
        outline: none;
        box-shadow: none;
      }

      .c28 {
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

      .c28:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c34 {
        font-size: 1.6rem;
        padding: 0;
      }

      .c14:focus-visible {
        outline: none;
      }

      .c46 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c45 {
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

      .c45 svg {
        font-size: 0.625rem;
      }

      .c45 svg path {
        fill: #4945ff;
      }

      .c45:hover {
        color: #7b79ff;
      }

      .c45:active {
        color: #271fe0;
      }

      .c45:after {
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

      .c45:focus-visible {
        outline: none;
      }

      .c45:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c19 {
        height: 4.5rem;
      }

      .c16 {
        margin: 0 auto;
        width: 552px;
      }

      .c18 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c35 svg {
        height: 1rem;
        width: 1rem;
      }

      .c35 svg path {
        fill: #666687;
      }

      .c30::-ms-reveal {
        display: none;
      }

      <div>
        <header
          class="c0"
        >
          <div
            class="c1"
          >
            <div
              class=""
            >
              <div
                class="c2"
              >
                <div
                  aria-autocomplete="none"
                  aria-controls="radix-:r3:"
                  aria-describedby=":r0:-hint :r0:-error"
                  aria-expanded="false"
                  class="c3 c4 c5"
                  data-state="closed"
                  dir="ltr"
                  id=":r0:"
                  overflow="hidden"
                  role="combobox"
                  tabindex="0"
                >
                  <span
                    class="c6 c7"
                  >
                    <span
                      class="c8 c9 c10"
                    >
                      <span
                        class="c11"
                      >
                        English
                      </span>
                    </span>
                  </span>
                  <span
                    class="c7"
                  >
                    <span
                      aria-hidden="true"
                      class="c12"
                    >
                      <svg
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
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div
          class="c13"
        >
          <main
            aria-labelledby="main-content-title"
            class="c14"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c15 c16"
            >
              <form
                action="#"
                novalidate=""
              >
                <div
                  class="c17 c18"
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    class="c19"
                    src="customAuthLogo.png"
                  />
                  <div
                    class="c20"
                  >
                    <h1
                      class="c8 c21"
                    >
                      Reset password
                    </h1>
                  </div>
                </div>
                <div
                  class="c22"
                >
                  <div>
                    <div
                      class=""
                    >
                      <div
                        class="c2"
                      >
                        <label
                          class="c8 c23 c24"
                          for=":r4:"
                        >
                          Password
                          <span
                            class="c8 c25 c26"
                          >
                            *
                          </span>
                        </label>
                        <div
                          class="c27 c28"
                        >
                          <input
                            aria-describedby=":r4:-hint"
                            aria-disabled="false"
                            aria-invalid="false"
                            aria-required="true"
                            class="c29 c30"
                            id=":r4:"
                            name="password"
                            type="password"
                            value=""
                          />
                          <div
                            class="c31"
                          >
                            <button
                              class="c32 c33 c34 c35"
                              type="button"
                            >
                              <span
                                class="c36"
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
                          class="c8 c37"
                          id=":r4:-hint"
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
                        class="c2"
                      >
                        <label
                          class="c8 c23 c24"
                          for=":r6:"
                        >
                          Confirm Password
                          <span
                            class="c8 c25 c26"
                          >
                            *
                          </span>
                        </label>
                        <div
                          class="c27 c28"
                        >
                          <input
                            aria-disabled="false"
                            aria-invalid="false"
                            aria-required="true"
                            class="c29 c30"
                            id=":r6:"
                            name="confirmPassword"
                            type="password"
                            value=""
                          />
                          <div
                            class="c31"
                          >
                            <button
                              class="c32 c33 c34 c35"
                              type="button"
                            >
                              <span
                                class="c36"
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
                    class="c38 c39 c40 c41"
                    type="submit"
                  >
                    <span
                      class="c8 c42"
                    >
                      Change password
                    </span>
                  </button>
                </div>
              </form>
            </div>
            <div
              class="c43"
            >
              <div
                class="c44"
              >
                <a
                  class="c45"
                  href="/auth/login"
                >
                  <span
                    class="c46"
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
