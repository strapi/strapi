/**
 *
 * Tests for NotFound
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { NotFound } from '../index';

const messages = {
  'app.components.NotFoundPage.back': 'Back to the homepage',
  'app.components.NotFound.description': 'The page you are looking does not exist',
};

describe('<NotFound />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <Router history={createMemoryHistory()}>
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={messages} defaultLocale="en">
            <NotFound />
          </IntlProvider>
        </ThemeProvider>
      </Router>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c21 {
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
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
      }

      .c18 svg {
        height: 12px;
        width: 12px;
      }

      .c18 svg > g,
      .c18 svg path {
        fill: #ffffff;
      }

      .c18[aria-disabled='true'] {
        pointer-events: none;
      }

      .c19 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border-radius: 4px;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c19 .sc-fTACoA {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c19 .c20 {
        color: #ffffff;
      }

      .c19[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c19[aria-disabled='true'] .c20 {
        color: #666687;
      }

      .c19[aria-disabled='true'] svg > g,
      .c19[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c19[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c19[aria-disabled='true']:active .c20 {
        color: #666687;
      }

      .c19[aria-disabled='true']:active svg > g,
      .c19[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c19:hover {
        background-color: #ffffff;
      }

      .c19:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c19:active .c20 {
        color: #4945ff;
      }

      .c19:active svg > g,
      .c19:active svg path {
        fill: #4945ff;
      }

      .c19 .c20 {
        color: #271fe0;
      }

      .c19 svg > g,
      .c19 svg path {
        fill: #271fe0;
      }

      .c2 {
        padding-bottom: 56px;
      }

      .c5 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c11 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c1 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c3 {
        overflow-x: hidden;
      }

      .c6 {
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

      .c7 {
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

      .c8 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c9 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c10 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c4 {
        outline: none;
      }

      .c0 {
        background: #f6f6f9;
      }

      .c17 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
      }

      .c12 {
        background: #ffffff;
        padding: 64px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c14 {
        padding-bottom: 24px;
      }

      .c16 {
        padding-bottom: 16px;
      }

      .c13 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-align: center;
      }

      .c15 svg {
        height: 5.5rem;
      }

      <div
        class="c0"
      >
        <div
          class="c1"
        >
          <div
            class="c2 c3"
          >
            <main
              aria-labelledby="main-content-title"
              class="c4"
              id="main-content"
              tabindex="-1"
            >
              <div
                style="height: 0px;"
              >
                <div
                  class="c5"
                  data-strapi-header="true"
                >
                  <div
                    class="c6"
                  >
                    <div
                      class="c7"
                    >
                      <h1
                        class="c8"
                        id="main-content-title"
                      >
                        404
                      </h1>
                    </div>
                  </div>
                  <p
                    class="c9 c10"
                  />
                </div>
              </div>
              <div
                class="c11"
              >
                <div
                  class="c12 c13"
                >
                  <div
                    aria-hidden="true"
                    class="c14 c15"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 216 120"
                      width="10rem"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        clip-rule="evenodd"
                        d="M184 23.75a7 7 0 110 14h-40a7 7 0 110 14h22a7 7 0 110 14h-10.174c-4.874 0-8.826 3.134-8.826 7 0 2.577 2 4.91 6 7a7 7 0 110 14H70a7 7 0 110-14H31a7 7 0 110-14h40a7 7 0 100-14H46a7 7 0 110-14h40a7 7 0 110-14h98zm0 28a7 7 0 110 14 7 7 0 010-14z"
                        fill="#DBDBFA"
                        fill-rule="evenodd"
                      />
                      <path
                        clip-rule="evenodd"
                        d="M130.672 22.75l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61zm-54.83 6.17l4.587-.515-4.587.515z"
                        fill="#fff"
                        fill-rule="evenodd"
                      />
                      <path
                        d="M75.842 28.92l4.587-.515m50.243-5.655l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61z"
                        stroke="#7E7BF6"
                        stroke-width="2.5"
                      />
                      <path
                        clip-rule="evenodd"
                        d="M128.14 27.02l8.42 61.483.757 6.168c.244 1.987-1.15 3.793-3.113 4.035l-52.443 6.439c-1.963.241-3.753-1.175-3.997-3.162l-8.15-66.376a2 2 0 011.742-2.23l6.487-.796"
                        fill="#F0F0FF"
                        fill-rule="evenodd"
                      />
                      <path
                        clip-rule="evenodd"
                        d="M133.229 10H87.672c-.76 0-1.447.308-1.945.806a2.741 2.741 0 00-.805 1.944v76c0 .76.308 1.447.805 1.945a2.741 2.741 0 001.945.805h59a2.74 2.74 0 001.944-.805 2.74 2.74 0 00.806-1.945V26.185c0-.73-.29-1.43-.806-1.945l-13.443-13.435a2.75 2.75 0 00-1.944-.805z"
                        fill="#fff"
                        fill-rule="evenodd"
                        stroke="#7F7CFA"
                        stroke-width="2.5"
                      />
                      <path
                        d="M133.672 11.153V22.75a3 3 0 003 3h7.933"
                        stroke="#807EFA"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                      />
                      <path
                        d="M95.672 76.75h26m-26-51h26-26zm0 12h43-43zm0 13h43-43zm0 13h43-43z"
                        stroke="#817FFA"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                      />
                    </svg>
                  </div>
                  <div
                    class="c16"
                  >
                    <p
                      class="c17"
                    >
                      The page you are looking does not exist
                    </p>
                  </div>
                  <a
                    aria-current="page"
                    aria-disabled="false"
                    class="c18 c19 active"
                    href="/"
                    variant="secondary"
                  >
                    <span
                      class="c20 c21"
                    >
                      Back to the homepage
                    </span>
                  </a>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    `);
  });
});
