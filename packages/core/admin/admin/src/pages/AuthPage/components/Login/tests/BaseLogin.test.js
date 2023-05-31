import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import * as yup from 'yup';
import { createMemoryHistory } from 'history';
import BaseLogin from '../BaseLogin';

jest.mock('../../../../../hooks/useConfigurations', () => () => ({
  logos: {
    auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
}));

describe('ADMIN | PAGES | AUTH | BaseLogin', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <BaseLogin onSubmit={() => {}} schema={yup.object()} />
          </Router>
        </ThemeProvider>
      </IntlProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c27 {
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

      .c8 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c10 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c13 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c15 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #d02b20;
      }

      .c28 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c36 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 0;
        color: #ffffff;
      }

      .c1 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c6 {
        padding-top: 24px;
        padding-bottom: 4px;
      }

      .c9 {
        padding-bottom: 32px;
      }

      .c22 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c23 {
        background: transparent;
        border-style: none;
      }

      .c31 {
        padding-left: 8px;
      }

      .c32 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        width: 100%;
        cursor: pointer;
      }

      .c38 {
        padding-top: 16px;
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

      .c11 {
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

      .c12 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
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
        -webkit-box-pack: unset;
        -webkit-justify-content: unset;
        -ms-flex-pack: unset;
        justify-content: unset;
      }

      .c33 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        gap: 8px;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c37 {
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

      .c34 {
        position: relative;
        outline: none;
      }

      .c34 > svg {
        height: 12px;
        width: 12px;
      }

      .c34 > svg > g,
      .c34 > svg path {
        fill: #ffffff;
      }

      .c34[aria-disabled='true'] {
        pointer-events: none;
      }

      .c34:after {
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

      .c34:focus-visible {
        outline: none;
      }

      .c34:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c30 {
        height: 18px;
        min-width: 18px;
        margin: 0;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c30:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c30:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
        width: 10px;
        height: 10px;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c30:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c30:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c30:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c30:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c30:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c30:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c35 {
        height: 2rem;
      }

      .c35[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c35[aria-disabled='true'] .c7 {
        color: #666687;
      }

      .c35[aria-disabled='true'] svg > g,.c35[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c35[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c35[aria-disabled='true']:active .c7 {
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

      .c14 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c16 {
        line-height: 0;
      }

      .c29 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c29 * {
        cursor: pointer;
      }

      .c19 {
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

      .c19::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c19::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c19:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c19::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c19[aria-disabled='true'] {
        color: inherit;
      }

      .c19:focus {
        outline: none;
        box-shadow: none;
      }

      .c20 {
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

      .c20::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c20::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c20:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c20::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c20[aria-disabled='true'] {
        color: inherit;
      }

      .c20:focus {
        outline: none;
        box-shadow: none;
      }

      .c18 {
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

      .c18:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c25 {
        font-size: 1.6rem;
        padding: 0;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c40 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c39 {
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

      .c39 svg {
        font-size: 0.625rem;
      }

      .c39 svg path {
        fill: #4945ff;
      }

      .c39:hover {
        color: #7b79ff;
      }

      .c39:active {
        color: #271fe0;
      }

      .c39:after {
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

      .c39:focus-visible {
        outline: none;
      }

      .c39:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c2 {
        margin: 0 auto;
        width: 552px;
      }

      .c4 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c5 {
        height: 4.5rem;
      }

      .c26 svg {
        height: 1rem;
        width: 1rem;
      }

      .c26 svg path {
        fill: #666687;
      }

      .c21::-ms-reveal {
        display: none;
      }

      <main
        aria-labelledby="main-content-title"
        class="c0"
        id="main-content"
        tabindex="-1"
      >
        <div
          class="c1 c2"
        >
          <form
            action="#"
            novalidate=""
          >
            <div
              class="c3 c4"
            >
              <img
                alt=""
                aria-hidden="true"
                class="c5"
                src="customAuthLogo.png"
              />
              <div
                class="c6"
              >
                <h1
                  class="c7 c8"
                >
                  Welcome!
                </h1>
              </div>
              <div
                class="c9"
              >
                <span
                  class="c7 c10"
                >
                  Log in to your Strapi account
                </span>
              </div>
            </div>
            <div
              class="c11"
            >
              <div>
                <div
                  class=""
                >
                  <div
                    class="c12"
                  >
                    <label
                      class="c7 c13 c14"
                      for="1"
                    >
                      Email
                      <span
                        class="c7 c15 c16"
                      >
                        *
                      </span>
                    </label>
                    <div
                      class="c17 c18"
                    >
                      <input
                        aria-disabled="false"
                        aria-invalid="false"
                        aria-required="true"
                        class="c19"
                        id="1"
                        name="email"
                        placeholder="kai@doe.com"
                        value=""
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div
                  class=""
                >
                  <div
                    class="c12"
                  >
                    <label
                      class="c7 c13 c14"
                      for="3"
                    >
                      Password
                      <span
                        class="c7 c15 c16"
                      >
                        *
                      </span>
                    </label>
                    <div
                      class="c17 c18"
                    >
                      <input
                        aria-disabled="false"
                        aria-invalid="false"
                        aria-required="true"
                        class="c20 c21"
                        id="3"
                        name="password"
                        type="password"
                        value=""
                      />
                      <div
                        class="c22"
                      >
                        <button
                          class="c23 c24 c25 c26"
                          type="button"
                        >
                          <span
                            class="c27"
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
              <div
                class=""
              >
                <div
                  class="c12"
                >
                  <label
                    class="c7 c28 c29"
                  >
                    <div
                      class=""
                    >
                      <input
                        aria-label="rememberMe"
                        class="c30"
                        id="5"
                        name="rememberMe"
                        type="checkbox"
                      />
                    </div>
                    <div
                      class="c31"
                    >
                      Remember me
                    </div>
                  </label>
                </div>
              </div>
              <button
                aria-disabled="false"
                class="c32 c33 c34 c35"
                type="submit"
              >
                <span
                  class="c7 c36"
                >
                  Login
                </span>
              </button>
            </div>
          </form>
        </div>
        <div
          class="c37"
        >
          <div
            class="c38"
          >
            <a
              class="c39"
              href="/auth/forgot-password"
            >
              <span
                class="c40"
              >
                Forgot your password?
              </span>
            </a>
          </div>
        </div>
      </main>
    `);
  });
});
