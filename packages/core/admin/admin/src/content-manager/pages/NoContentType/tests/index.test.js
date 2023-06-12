import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../components/Theme';
import ThemeToggleProvider from '../../../../components/ThemeToggleProvider';
import NoContentType from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFocusWhenNavigate: jest.fn(),
}));

describe('CONTENT MANAGER | pages | NoContentType', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <Router history={createMemoryHistory()}>
        <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
          <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
            <Theme>
              <NoContentType />
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </Router>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c5 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c12 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
        text-align: center;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c3 {
        min-width: 0;
      }

      .c6 {
        padding-right: 56px;
        padding-left: 56px;
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

      .c2 {
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

      .c8 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c10 svg {
        height: 5.5rem;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c13 {
        background: #4945ff;
        padding-top: 8px;
        padding-right: 16px;
        padding-bottom: 8px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c19 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c14 {
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

      .c15 {
        position: relative;
        outline: none;
      }

      .c15 > svg {
        height: 12px;
        width: 12px;
      }

      .c15 > svg > g,
      .c15 > svg path {
        fill: #ffffff;
      }

      .c15[aria-disabled='true'] {
        pointer-events: none;
      }

      .c15:after {
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

      .c15:focus-visible {
        outline: none;
      }

      .c15:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c16 {
        -webkit-text-decoration: none;
        text-decoration: none;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
      }

      .c16[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c16[aria-disabled='true'] .c18 {
        color: #666687;
      }

      .c16[aria-disabled='true'] svg > g,.c16[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c16[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c16[aria-disabled='true']:active .c18 {
        color: #666687;
      }

      .c16[aria-disabled='true']:active svg > g,.c16[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c16:hover {
        background-color: #ffffff;
      }

      .c16:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c16:active .c18 {
        color: #4945ff;
      }

      .c16:active svg > g,
      .c16:active svg path {
        fill: #4945ff;
      }

      .c16 .c18 {
        color: #271fe0;
      }

      .c16 svg > g,
      .c16 svg path {
        fill: #271fe0;
      }

      <main
        aria-labelledby="main-content-title"
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
                class="c3 c4"
              >
                <h1
                  class="c5"
                >
                  Content
                </h1>
              </div>
            </div>
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
                height="1rem"
                viewBox="0 0 216 120"
                width="10rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  clip-path="url(#EmptyDocuments_svg__a)"
                  opacity="0.84"
                >
                  <path
                    clip-rule="evenodd"
                    d="M189.25 19.646a7.583 7.583 0 0 1 0 15.166h-43.333a7.583 7.583 0 0 1 0 15.167h23.833a7.583 7.583 0 0 1 0 15.167h-11.022c-5.28 0-9.561 3.395-9.561 7.583 0 1.956 1.063 3.782 3.19 5.48 2.017 1.608 4.824 1.817 7.064 3.096a7.583 7.583 0 0 1-3.754 14.174H65.75a7.583 7.583 0 0 1 0-15.166H23.5a7.583 7.583 0 1 1 0-15.167h43.333a7.583 7.583 0 1 0 0-15.167H39.75a7.583 7.583 0 1 1 0-15.166h43.333a7.583 7.583 0 0 1 0-15.167H189.25Zm0 30.333a7.583 7.583 0 1 1 0 15.166 7.583 7.583 0 0 1 0-15.166Z"
                    fill="#D9D8FF"
                    fill-opacity="0.8"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="m132.561 19.646 10.077 73.496.906 7.374a4.334 4.334 0 0 1-3.773 4.829l-63.44 7.789a4.333 4.333 0 0 1-4.83-3.772l-9.767-79.547a2.166 2.166 0 0 1 1.91-2.417l5.262-.59 63.655-7.162ZM73.162 26.33l4.97-.557-4.97.557Z"
                    fill="#fff"
                    fill-rule="evenodd"
                  />
                  <path
                    d="m73.162 26.33 4.97-.557m54.429-6.127 10.077 73.496.906 7.374a4.334 4.334 0 0 1-3.773 4.829l-63.44 7.789a4.333 4.333 0 0 1-4.83-3.772l-9.767-79.547a2.166 2.166 0 0 1 1.91-2.417l5.262-.59 63.655-7.162Z"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    clip-rule="evenodd"
                    d="m129.818 24.27 9.122 66.608.82 6.682c.264 2.153-1.246 4.11-3.373 4.371l-56.812 6.976c-2.127.261-4.066-1.272-4.33-3.425l-8.83-71.908a2.167 2.167 0 0 1 1.887-2.415l7.028-.863"
                    fill="#F0F0FF"
                    fill-rule="evenodd"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M135.331 5.833H85.978a2.97 2.97 0 0 0-2.107.873A2.97 2.97 0 0 0 83 8.813v82.333c0 .823.333 1.567.872 2.106a2.97 2.97 0 0 0 2.107.873h63.917a2.97 2.97 0 0 0 2.106-.873 2.97 2.97 0 0 0 .873-2.106V23.367a2.98 2.98 0 0 0-.873-2.107L137.437 6.705a2.98 2.98 0 0 0-2.106-.872Z"
                    fill="#fff"
                    fill-rule="evenodd"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    d="M135.811 7.082v12.564a3.25 3.25 0 0 0 3.25 3.25h8.595M94.644 78.146h28.167m-28.167-55.25h28.167-28.167Zm0 13h46.584-46.584Zm0 14.083h46.584-46.584Zm0 14.084h46.584-46.584Z"
                    stroke="#7B79FF"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                  />
                </g>
                <defs>
                  <clippath
                    id="EmptyDocuments_svg__a"
                  >
                    <path
                      d="M0 0h216v120H0z"
                      fill="#fff"
                    />
                  </clippath>
                </defs>
              </svg>
            </div>
            <div
              class="c11"
            >
              <p
                class="c12"
              >
                You don't have any content yet, we recommend you to create your first Content-Type.
              </p>
            </div>
            <a
              aria-disabled="false"
              class="c13 c14 c15 c16"
              href="/plugins/content-type-builder/content-types/create-content-type"
            >
              <div
                aria-hidden="true"
                class="c17"
              >
                <svg
                  fill="none"
                  height="1rem"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M24 13.604a.3.3 0 0 1-.3.3h-9.795V23.7a.3.3 0 0 1-.3.3h-3.21a.3.3 0 0 1-.3-.3v-9.795H.3a.3.3 0 0 1-.3-.3v-3.21a.3.3 0 0 1 .3-.3h9.795V.3a.3.3 0 0 1 .3-.3h3.21a.3.3 0 0 1 .3.3v9.795H23.7a.3.3 0 0 1 .3.3v3.21Z"
                    fill="#212134"
                  />
                </svg>
              </div>
              <span
                class="c18 c19"
              >
                Create your first Content-type
              </span>
            </a>
          </div>
        </div>
      </main>
    `);
  });
});
