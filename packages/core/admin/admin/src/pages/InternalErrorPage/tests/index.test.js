import React from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import InternalErrorPage from '../index';

const history = createMemoryHistory();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <Router history={history}>
        <InternalErrorPage />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('InternalErrorPage', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c2 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c7 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c8 {
        background: #ffffff;
        padding: 64px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c10 {
        padding-bottom: 24px;
      }

      .c12 {
        padding-bottom: 16px;
      }

      .c17 {
        padding-left: 8px;
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

      .c6 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c13 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
      }

      .c16 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c14 {
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

      .c14 svg {
        height: 12px;
        width: 12px;
      }

      .c14 svg > g,
      .c14 svg path {
        fill: #ffffff;
      }

      .c14[aria-disabled='true'] {
        pointer-events: none;
      }

      .c14:after {
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

      .c14:focus-visible {
        outline: none;
      }

      .c14:focus-visible:after {
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

      .c11 svg {
        height: 5.5rem;
      }

      .c15 {
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
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

      .c15 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c15 .c5 {
        color: #ffffff;
      }

      .c15[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c15[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c15[aria-disabled='true'] svg > g,
      .c15[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c15[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c15[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c15[aria-disabled='true']:active svg > g,
      .c15[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c15:hover {
        background-color: #ffffff;
      }

      .c15:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c15:active .c5 {
        color: #4945ff;
      }

      .c15:active svg > g,
      .c15:active svg path {
        fill: #4945ff;
      }

      .c15 .c5 {
        color: #271fe0;
      }

      .c15 svg > g,
      .c15 svg path {
        fill: #271fe0;
      }

      .c0:focus-visible {
        outline: none;
      }

      <main
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
                  Page not found
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div
          class="c1 c7"
        >
          <div
            class="c1 c8 c9"
          >
            <div
              aria-hidden="true"
              class="c1 c10 c11"
            >
              <svg
                fill="none"
                height="1em"
                viewBox="0 0 216 120"
                width="10rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  opacity="0.88"
                >
                  <path
                    clip-rule="evenodd"
                    d="M119 28a7 7 0 110 14h64a7 7 0 110 14h22a7 7 0 110 14h-19a7 7 0 100 14h6a7 7 0 110 14h-52a7.024 7.024 0 01-1.5-.161A7.024 7.024 0 01137 98H46a7 7 0 110-14H7a7 7 0 110-14h40a7 7 0 100-14H22a7 7 0 110-14h40a7 7 0 110-14h57zm90 56a7 7 0 110 14 7 7 0 010-14z"
                    fill="#D9D8FF"
                    fill-opacity="0.8"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M73.83 102.273l-8.621 1.422a4 4 0 01-4.518-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404c.475 3.377 2.408 16.468 2.572 17.63"
                    fill="#fff"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M71.805 98.712l-3.696.526a3.618 3.618 0 01-4.096-3.085l-9.995-71.925a3.646 3.646 0 013.097-4.108l71.037-10.096a3.618 3.618 0 014.097 3.085l.859 6.18 9.205 66.599c.306 2.212-1.219 4.257-3.407 4.566a4.31 4.31 0 01-.071.01l-67.03 8.248z"
                    fill="#F0F0FF"
                    fill-rule="evenodd"
                  />
                  <path
                    d="M69.278 103.123l-4.07.572a4 4 0 01-4.517-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404l.957 6.808M137.5 20.38l.5 3.12"
                    stroke="#7B79FF"
                    stroke-linecap="round"
                    stroke-width="2.5"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M164.411 30.299L85.844 22.04a2.74 2.74 0 00-2.018.598 2.741 2.741 0 00-1.004 1.85l-8.363 79.561c-.079.755.155 1.471.598 2.018a2.74 2.74 0 001.85 1.004l78.567 8.258a2.739 2.739 0 002.018-.598 2.741 2.741 0 001.005-1.849l8.362-79.562a2.743 2.743 0 00-.598-2.018 2.74 2.74 0 00-1.85-1.004z"
                    fill="#fff"
                    fill-rule="evenodd"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M92.99 30.585l62.655 6.585a3 3 0 012.67 3.297l-5.54 52.71a3 3 0 01-3.297 2.67L86.823 89.26a3 3 0 01-2.67-3.297l5.54-52.71a3 3 0 013.297-2.67z"
                    fill="#fff"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M92.74 73.878l9.798-6.608a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l9.98 15.438 1.434 2.392-.687 8.124a1 1 0 01-1.106.91l-56.963-6.329a1 1 0 01-.886-1.085l.755-8.199 2.755-1.562z"
                    fill="#F0F0FF"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M155.514 38.413L92.86 31.828c-.481-.05-.937.098-1.285.38a1.745 1.745 0 00-.639 1.177l-5.54 52.71c-.05.48.099.936.38 1.284.282.348.697.589 1.178.64l62.655 6.585a1.747 1.747 0 001.923-1.558l5.54-52.71a1.75 1.75 0 00-1.558-1.923z"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    d="M104.405 55.917a6 6 0 101.254-11.934 6 6 0 00-1.254 11.934z"
                    fill="#F0F0FF"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    d="M90.729 75.425l11.809-8.155a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l11.064 17.556"
                    stroke="#7B79FF"
                    stroke-linecap="round"
                    stroke-width="2.5"
                  />
                </g>
              </svg>
            </div>
            <div
              class="c1 c12"
            >
              <p
                class="c5 c13"
              >
                An error occured
              </p>
            </div>
            <a
              aria-current="page"
              aria-disabled="false"
              class="c14 c15 active"
              href="/"
              variant="secondary"
            >
              <span
                class="c5 c16"
              >
                Back to homepage
              </span>
              <div
                aria-hidden="true"
                class="c1 c17"
              >
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 10.7c0-.11.09-.2.2-.2h18.06l-8.239-8.239a.2.2 0 010-.282L11.86.14a.2.2 0 01.282 0L23.86 11.86a.2.2 0 010 .282L12.14 23.86a.2.2 0 01-.282 0L10.02 22.02a.2.2 0 010-.282L18.26 13.5H.2a.2.2 0 01-.2-.2v-2.6z"
                    fill="#212134"
                  />
                </svg>
              </div>
            </a>
          </div>
        </div>
      </main>
    `);
  });
});
