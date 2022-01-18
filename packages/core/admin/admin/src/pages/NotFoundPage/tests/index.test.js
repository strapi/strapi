import React from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import NotFoundPage from '../index';
import { useModels } from '../../../hooks';

jest.mock('../../../hooks', () => ({
  useModels: jest.fn(),
}));

const history = createMemoryHistory();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <Router history={history}>
        <NotFoundPage />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('NotFoundPage', () => {
  useModels.mockImplementation(() => ({
    isLoading: false,
    collectionTypes: [],
    singleTypes: [],
  }));

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c12 {
        color: #666687;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c7 {
        background: #ffffff;
        padding: 64px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c9 {
        padding-bottom: 24px;
      }

      .c11 {
        padding-bottom: 16px;
      }

      .c8 {
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

      .c10 svg {
        height: 5.5rem;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c16 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c18 {
        padding-left: 8px;
      }

      .c13 {
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

      .c13 svg {
        height: 12px;
        width: 12px;
      }

      .c13 svg > g,
      .c13 svg path {
        fill: #ffffff;
      }

      .c13[aria-disabled='true'] {
        pointer-events: none;
      }

      .c13:after {
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

      .c13:focus-visible {
        outline: none;
      }

      .c13:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c14 {
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

      .c14 .c17 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c14 .c15 {
        color: #ffffff;
      }

      .c14[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true'] .c15 {
        color: #666687;
      }

      .c14[aria-disabled='true'] svg > g,
      .c14[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c14[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true']:active .c15 {
        color: #666687;
      }

      .c14[aria-disabled='true']:active svg > g,
      .c14[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c14:hover {
        background-color: #ffffff;
      }

      .c14:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c14:active .c15 {
        color: #4945ff;
      }

      .c14:active svg > g,
      .c14:active svg path {
        fill: #4945ff;
      }

      .c14 .c15 {
        color: #271fe0;
      }

      .c14 svg > g,
      .c14 svg path {
        fill: #271fe0;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c6 {
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

      .c5 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
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
                  id="title"
                >
                  Page not found
                </h1>
              </div>
            </div>
            <p
              class="c5"
            />
          </div>
        </div>
        <div
          class="c6"
        >
          <div
            class="c7 c8"
          >
            <div
              aria-hidden="true"
              class="c9 c10"
            >
              <svg
                fill="none"
                height="1em"
                viewBox="0 0 216 120"
                width="10rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  opacity="0.8"
                >
                  <path
                    clip-rule="evenodd"
                    d="M119 28a7 7 0 110 14h64a7 7 0 110 14h22a7 7 0 110 14h-19a7 7 0 100 14h6a7 7 0 110 14h-52a7.024 7.024 0 01-1.5-.161A7.024 7.024 0 01137 98H46a7 7 0 110-14H7a7 7 0 110-14h40a7 7 0 100-14H22a7 7 0 110-14h40a7 7 0 110-14h57zm90 56a7 7 0 110 14 7 7 0 010-14z"
                    fill="#D9D8FF"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M69.278 103.123l-4.07.572a4 4 0 01-4.517-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404l.957 6.808"
                    fill="#fff"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M71.805 98.712l-3.696.526a3.618 3.618 0 01-4.096-3.085l-9.996-71.925a3.646 3.646 0 013.097-4.108l71.038-10.096a3.619 3.619 0 014.097 3.085l.859 6.18 9.205 66.599c.306 2.212-1.22 4.257-3.408 4.566a4.192 4.192 0 01-.07.01l-67.03 8.248z"
                    fill="#F0F0FF"
                    fill-rule="evenodd"
                  />
                  <path
                    d="M69.278 103.123l-4.07.572a4 4 0 01-4.517-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404l.957 6.808M137.5 20.38l.5 3.12"
                    stroke="#4945FF"
                    stroke-linecap="round"
                    stroke-opacity="0.83"
                    stroke-width="2.5"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M164.411 30.299L85.844 22.04a2.74 2.74 0 00-2.018.598 2.741 2.741 0 00-1.004 1.85l-8.363 79.561c-.079.755.155 1.471.598 2.018a2.74 2.74 0 001.85 1.004l78.567 8.258a2.739 2.739 0 002.018-.598 2.741 2.741 0 001.005-1.849l8.362-79.562a2.743 2.743 0 00-.598-2.018 2.74 2.74 0 00-1.85-1.004z"
                    fill="#fff"
                    fill-rule="evenodd"
                    stroke="#4945FF"
                    stroke-opacity="0.83"
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
                    d="M92.74 73.878l9.798-6.608a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l9.98 15.438 1.434 2.392-.687 8.124a1 1 0 01-1.08.913l-.026-.003-56.963-6.329a1 1 0 01-.886-1.085l.755-8.199 2.755-1.562z"
                    fill="#F0F0FF"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M155.514 38.413l-62.655-6.585c-.48-.05-.936.098-1.284.38a1.744 1.744 0 00-.639 1.177l-5.54 52.71c-.05.48.099.936.38 1.284.282.348.697.589 1.178.64l62.654 6.585a1.746 1.746 0 001.924-1.558l5.54-52.71c.05-.48-.099-.936-.381-1.284a1.744 1.744 0 00-1.177-.639z"
                    stroke="#4945FF"
                    stroke-opacity="0.83"
                    stroke-width="2.5"
                  />
                  <path
                    d="M104.405 55.916a6 6 0 101.254-11.933 6 6 0 00-1.254 11.934z"
                    fill="#F0F0FF"
                    stroke="#4945FF"
                    stroke-opacity="0.83"
                    stroke-width="2.5"
                  />
                  <path
                    d="M90.729 75.425l11.809-8.155a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l11.064 17.557"
                    stroke="#4945FF"
                    stroke-linecap="round"
                    stroke-opacity="0.83"
                    stroke-width="2.5"
                  />
                </g>
              </svg>
            </div>
            <div
              class="c11"
            >
              <p
                class="c12"
              >
                Oops! We can't seem to find the page you're looging for...
              </p>
            </div>
            <a
              aria-current="page"
              aria-disabled="false"
              class="c13 c14 active"
              href="/"
              variant="secondary"
            >
              <span
                class="c15 c16"
              >
                Back to homepage
              </span>
              <div
                aria-hidden="true"
                class="c17 c18"
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
