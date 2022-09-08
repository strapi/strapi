/**
 *
 * Tests for NoPermissions
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../components/Theme';
import ThemeToggleProvider from '../../../../components/ThemeToggleProvider';
import NoPermissions from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useFocusWhenNavigate: jest.fn(),
}));

describe('<NoPermissions />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
        <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
          <Theme>
            <NoPermissions />
          </Theme>
        </ThemeToggleProvider>
      </IntlProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c11 {
        color: #666687;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c6 {
        background: #ffffff;
        padding: 64px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c8 {
        padding-bottom: 24px;
      }

      .c10 {
        padding-bottom: 16px;
      }

      .c7 {
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

      .c9 svg {
        height: 5.5rem;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c5 {
        padding-right: 56px;
        padding-left: 56px;
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

      .c4 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
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
                class="c3"
              >
                <h1
                  class="c4"
                >
                  Content
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div
          class="c5"
        >
          <div
            class="c6 c7"
          >
            <div
              aria-hidden="true"
              class="c8 c9"
            >
              <svg
                fill="none"
                height="1em"
                viewBox="0 0 192 120"
                width="10rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  opacity="0.88"
                >
                  <path
                    clip-rule="evenodd"
                    d="M160.28 53.026a3.89 3.89 0 00-.15-.281c-3.5-5.96-7.289-11.263-11.52-15.857h18.097c4.444 0 8.047 3.612 8.047 8.069 0 4.456-3.603 8.07-8.047 8.07h-6.427zm-8.492 16.139c-11.563 11.57-31.954 19.597-55.211 19.597-31.435 0-54.383-16.705-55.7-35.736H28.741c-4.444 0-8.047 3.613-8.047 8.07 0 4.456 3.603 8.069 8.047 8.069H40.44c5.604 0 10.147 3.612 10.147 8.069 0 2.524-1.66 4.846-4.98 6.964-.942.6-2.033.875-3.123 1.15-.33.082-.658.165-.982.257a8.07 8.07 0 00-5.861 7.767c0 4.457 3.603 8.07 8.048 8.07h95.425c4.445 0 8.048-3.613 8.048-8.07 0-4.456-3.603-8.069-8.048-8.069h44.838c4.445 0 8.048-3.612 8.048-8.07 0-4.456-3.603-8.068-8.048-8.068h-32.164zM68.056 20.749H8.048C3.603 20.75 0 24.362 0 28.82c0 4.456 3.603 8.069 8.048 8.069h37.314c4.606-6.844 12.5-12.478 22.694-16.139zM0 61.095c0-4.456 3.603-8.069 8.048-8.069s8.048 3.613 8.048 8.07c0 4.456-3.603 8.069-8.048 8.069S0 65.552 0 61.095z"
                    fill="#DBDBFA"
                    fill-rule="evenodd"
                  />
                  <path
                    d="M157.424 48.415l1.447 2.131"
                    stroke="#7B79FF"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                  />
                  <path
                    d="M154.195 58.894c-45.683-57.685-95.639-25.813-117.374.01-1.403 1.666-1.426 4.115-.15 5.881 47.31 65.454 96.71 29.043 117.705-.133 1.239-1.723 1.137-4.095-.181-5.758z"
                    fill="#fff"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M112.869 27.294c-9.141-2.486-18.085-2.558-26.571-.941-21.301 4.058-39.457 18.708-50.43 31.743-1.794 2.132-1.797 5.216-.205 7.419 11.917 16.487 24.03 26.65 35.888 32.099.79.363 1.58.705 2.367 1.026l1.206-2.208a57.244 57.244 0 01-2.529-1.09C61.228 90.12 49.426 80.29 37.689 64.05c-.961-1.329-.92-3.142.092-4.344C48.545 46.918 66.234 32.72 86.766 28.809c7.905-1.506 16.271-1.495 24.869.744l1.234-2.26zM84.593 99.259c7.096 1.397 13.98 1.156 20.536-.278 20.46-4.474 37.825-20.594 48.236-35.062.899-1.25.841-3.007-.145-4.252-10.729-13.547-21.653-22.062-32.352-26.854l1.202-2.2c11.025 4.98 22.209 13.738 33.11 27.502 1.649 2.082 1.794 5.069.214 7.264-10.583 14.709-28.415 31.383-49.731 36.044-7.116 1.556-14.608 1.77-22.324.132l1.254-2.296z"
                    fill="#7B79FF"
                    fill-rule="evenodd"
                  />
                  <path
                    d="M126.492 21.282c13.231 6.322 21.865 14.379 27.624 21.78M33.4 47.845c18.935-25.304 55.13-40.341 83.887-30.007"
                    stroke="#7B79FF"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="94.313"
                    cy="65.708"
                    fill="#F0F0FF"
                    rx="18.395"
                    ry="18.444"
                  />
                  <path
                    clip-rule="evenodd"
                    d="M104.094 43.565a24.006 24.006 0 00-9.777-2.067c-13.334 0-24.144 10.839-24.144 24.208 0 8.429 4.296 15.851 10.813 20.186l1.203-2.204c-5.74-3.902-9.516-10.498-9.516-17.982 0-11.995 9.697-21.708 21.644-21.708 3.045 0 5.944.631 8.574 1.77l1.203-2.203zM91.283 87.202c.991.14 2.004.212 3.034.212 11.947 0 21.644-9.713 21.644-21.708a21.66 21.66 0 00-5.222-14.141l1.272-2.33a24.16 24.16 0 016.45 16.471c0 13.37-10.81 24.208-24.144 24.208-1.47 0-2.908-.132-4.305-.384l1.27-2.328z"
                    fill="#7B79FF"
                    fill-rule="evenodd"
                  />
                  <path
                    d="M116.062 54.18c0 4.406-3.561 7.972-7.947 7.972-4.387 0-7.948-3.566-7.948-7.972 0-4.406 3.561-7.972 7.948-7.972 4.386 0 7.947 3.566 7.947 7.972z"
                    fill="#fff"
                    stroke="#7B79FF"
                    stroke-width="2.5"
                  />
                  <path
                    d="M109.805 32.838c1.275-2.324 4.079-3.019 6.296-1.56 2.265 1.49 3.053 4.654 1.751 7.027l-31.287 57.05c-1.275 2.324-4.078 3.018-6.296 1.559-2.265-1.49-3.053-4.653-1.75-7.027l31.286-57.05z"
                    fill="#fff"
                  />
                  <rect
                    fill="#7B79FF"
                    height="134.376"
                    rx="1.834"
                    transform="matrix(.82817 .56048 -.47918 .87772 126.515 0)"
                    width="3.668"
                  />
                </g>
              </svg>
            </div>
            <div
              class="c10"
            >
              <p
                class="c11"
              >
                You don't have the permissions to access that content
              </p>
            </div>
          </div>
        </div>
      </main>
    `);
  });
});
