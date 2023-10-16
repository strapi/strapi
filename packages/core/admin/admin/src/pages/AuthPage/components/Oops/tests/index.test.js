import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import Oops from '..';

describe('ADMIN | PAGES | AUTH | Oops', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <ThemeProvider theme={lightTheme}>
          <Router history={history}>
            <Oops />
          </Router>
        </ThemeProvider>
      </IntlProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c8 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c20 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c21 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c25 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
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

      .c12 {
        padding-top: 8px;
        padding-bottom: 64px;
      }

      .c14 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c19 {
        padding-top: 24px;
        padding-bottom: 32px;
      }

      .c22 {
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

      .c16 {
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

      .c23 {
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

      .c11 > svg {
        width: 0.375rem;
      }

      .c11 > svg > path {
        fill: #666687;
      }

      .c9 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c13:focus-visible {
        outline: none;
      }

      .c24 {
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

      .c24 svg {
        font-size: 0.625rem;
      }

      .c24 svg path {
        fill: #4945ff;
      }

      .c24:hover {
        color: #7b79ff;
      }

      .c24:active {
        color: #271fe0;
      }

      .c24:after {
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

      .c24:focus-visible {
        outline: none;
      }

      .c24:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c18 {
        height: 4.5rem;
      }

      .c15 {
        margin: 0 auto;
        width: 552px;
      }

      .c17 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
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
                      class="c8 c9"
                    >
                      <span
                        class="c10"
                      />
                    </span>
                  </span>
                  <span
                    class="c7"
                  >
                    <span
                      aria-hidden="true"
                      class="c11"
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
          class="c12"
        >
          <main
            aria-labelledby="main-content-title"
            class="c13"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c14 c15"
            >
              <div
                class="c16 c17"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  class="c18"
                  src=""
                />
                <div
                  class="c19"
                >
                  <h1
                    class="c20"
                  >
                    Oops...
                  </h1>
                </div>
                <span
                  class="c21"
                >
                  Your account has been suspended.
                </span>
                <div
                  class="c22"
                >
                  <span
                    class="c21"
                  >
                    If this is a mistake, please contact your administrator.
                  </span>
                </div>
              </div>
            </div>
            <div
              class="c23"
            >
              <div
                class="c22"
              >
                <a
                  class="c24"
                  href="/auth/login"
                >
                  <span
                    class="c25"
                  >
                    Sign in
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
