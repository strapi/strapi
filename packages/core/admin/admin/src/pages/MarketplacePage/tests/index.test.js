import React from 'react';
import {
  render,
  waitFor,
  waitForElementToBeRemoved,
  getByPlaceholderText,
  fireEvent,
  screen,
} from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useTracking, useAppInfos } from '@strapi/helper-plugin';
import MarketPlacePage from '../index';
import server from './server';

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
  pxToRem: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useAppInfos: jest.fn(() => ({ autoReload: true })),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const App = (
  <QueryClientProvider client={client}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <MarketPlacePage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('Marketplace page', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    const { container, getByTestId, getByRole } = render(App);
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /marketplace/i })).toBeInTheDocument());

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c26 {
        padding-bottom: 16px;
        width: 25%;
      }

      .c42 {
        border-radius: 4px;
        width: 64px;
        height: 64px;
      }

      .c43 {
        padding-top: 16px;
      }

      .c45 {
        padding-top: 8px;
      }

      .c60 {
        margin-left: 4px;
        width: 24px;
        height: auto;
      }

      .c61 {
        padding-left: 16px;
      }

      .c64 {
        padding-top: 32px;
      }

      .c57 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c54 {
        padding-right: 8px;
      }

      .c51 {
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

      .c51 svg {
        height: 12px;
        width: 12px;
      }

      .c51 svg > g,
      .c51 svg path {
        fill: #ffffff;
      }

      .c51[aria-disabled='true'] {
        pointer-events: none;
      }

      .c51:after {
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

      .c51:focus-visible {
        outline: none;
      }

      .c51:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c55 {
        height: 100%;
      }

      .c52 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
      }

      .c52 .c53 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c52 .c56 {
        color: #ffffff;
      }

      .c52[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c52[aria-disabled='true'] .c56 {
        color: #666687;
      }

      .c52[aria-disabled='true'] svg > g,
      .c52[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c52[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c52[aria-disabled='true']:active .c56 {
        color: #666687;
      }

      .c52[aria-disabled='true']:active svg > g,
      .c52[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c52:hover {
        background-color: #ffffff;
      }

      .c52:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c52:active .c56 {
        color: #4945ff;
      }

      .c52:active svg > g,
      .c52:active svg path {
        fill: #4945ff;
      }

      .c52 .c56 {
        color: #271fe0;
      }

      .c52 svg > g,
      .c52 svg path {
        fill: #271fe0;
      }

      .c16 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c18 {
        background: #f6ecfc;
        padding: 12px;
        border-radius: 4px;
      }

      .c40 {
        background: #ffffff;
        padding-top: 16px;
        padding-right: 24px;
        padding-bottom: 16px;
        padding-left: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        height: 100%;
      }

      .c17 {
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

      .c41 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: normal;
        -webkit-box-align: normal;
        -ms-flex-align: normal;
        align-items: normal;
      }

      .c23 {
        color: #666687;
        margin-left: 8px;
        width: 12px;
        height: 12px;
      }

      .c58 {
        color: #328048;
        margin-left: 8px;
      }

      .c62 {
        color: #328048;
        margin-right: 8px;
        width: 12;
        height: 12;
      }

      .c24 path {
        fill: #666687;
      }

      .c59 path {
        fill: #328048;
      }

      .c34 {
        padding-right: 8px;
        padding-left: 12px;
      }

      .c30 {
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

      .c32 {
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

      .c29 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c37 {
        border: none;
        border-radius: 4px;
        padding-left: 0;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c37::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c37::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c37:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c37::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c37[aria-disabled='true'] {
        color: inherit;
      }

      .c37:focus {
        outline: none;
        box-shadow: none;
      }

      .c33 {
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

      .c33:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c28 {
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

      .c36 {
        font-size: 0.8rem;
      }

      .c36 svg path {
        fill: #32324d;
      }

      .c27 {
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c27:focus-within .c35 svg path {
        fill: #4945ff;
      }

      .c27 .c31 {
        border: 1px solid transparent;
      }

      .c27 .c31:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c47 {
        padding-top: 24px;
      }

      .c48 {
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

      .c20 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c49 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c49 > * + * {
        margin-left: 8px;
      }

      .c21 {
        font-weight: 500;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c25 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c44 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c63 {
        font-weight: 600;
        color: #328048;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c19 {
        margin-right: 24px;
      }

      .c19 svg {
        width: 2rem;
        height: 2rem;
      }

      .c22 {
        word-break: break-all;
      }

      .c38 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c39 {
        grid-column: span 4;
        max-width: 100%;
      }

      .c1 {
        padding-bottom: 56px;
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c15 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c0 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c2 {
        overflow-x: hidden;
      }

      .c5 {
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

      .c6 {
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

      .c7 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c14 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c13 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c11 {
        padding-right: 8px;
      }

      .c50 {
        padding-left: 8px;
      }

      .c8 {
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

      .c8 svg {
        height: 12px;
        width: 12px;
      }

      .c8 svg > g,
      .c8 svg path {
        fill: #ffffff;
      }

      .c8[aria-disabled='true'] {
        pointer-events: none;
      }

      .c8:after {
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

      .c8:focus-visible {
        outline: none;
      }

      .c8:focus-visible:after {
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
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border-radius: 4px;
        border: 1px solid #dcdce4;
        background: #ffffff;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c9 .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c9 .c12 {
        color: #ffffff;
      }

      .c9[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true'] .c12 {
        color: #666687;
      }

      .c9[aria-disabled='true'] svg > g,
      .c9[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c9[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true']:active .c12 {
        color: #666687;
      }

      .c9[aria-disabled='true']:active svg > g,
      .c9[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c9:hover {
        background-color: #f6f6f9;
      }

      .c9:active {
        background-color: #eaeaef;
      }

      .c9 .c12 {
        color: #32324d;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #32324d;
      }

      .c46 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      @media (max-width:68.75rem) {
        .c39 {
          grid-column: span 6;
        }
      }

      @media (max-width:34.375rem) {
        .c39 {
          grid-column: span 12;
        }
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-labelledby="main-content-title"
            class="c3"
            id="main-content"
            tabindex="-1"
          >
            <div
              style="height: 0px;"
            >
              <div
                class="c4"
                data-strapi-header="true"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c6"
                  >
                    <h1
                      class="c7"
                    >
                      Marketplace
                    </h1>
                  </div>
                  <a
                    aria-disabled="false"
                    class="c8 c9"
                    href="https://market.strapi.io/submit-plugin"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <div
                      aria-hidden="true"
                      class="c10 c11"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 25"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M13.571 18.272H10.43v-8.47H2.487a.2.2 0 01-.14-.343L11.858.058a.2.2 0 01.282 0l9.513 9.4a.2.2 0 01-.14.343H13.57v8.47zM2.2 21.095a.2.2 0 00-.2.2v2.424c0 .11.09.2.2.2h19.6a.2.2 0 00.2-.2v-2.424a.2.2 0 00-.2-.2H2.2z"
                          fill="#212134"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <span
                      class="c12 c13"
                    >
                      Submit your plugin
                    </span>
                  </a>
                </div>
                <p
                  class="c14"
                >
                  Get more out of Strapi
                </p>
              </div>
            </div>
            <div
              class="c15"
            >
              <a
                href="https://strapi.canny.io/plugin-requests"
                rel="noopener noreferrer nofollow"
                style="text-decoration: none;"
                target="_blank"
              >
                <div
                  class="c16 c17"
                >
                  <div
                    class="c18 c17 c19"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 32 32"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                        fill="#AC73E6"
                      />
                      <path
                        clip-rule="evenodd"
                        d="M15.027 13.839c-3.19-.836-6.305-1.064-10.18-.608-1.215.152-1.063 1.975.076 2.203.304.836.456 2.355.912 3.267.987 2.279 5.622 1.975 7.369.835 1.14-.683 1.443-2.279 1.9-3.494.227-.684 1.595-.684 1.822 0 .38 1.215.76 2.81 1.9 3.494 1.747 1.14 6.381 1.444 7.369-.835.456-.912.607-2.431.911-3.267 1.14-.228 1.216-2.051.076-2.203-3.874-.456-6.989-.228-10.18.608-.455.075-1.519.075-1.975 0z"
                        fill="#fff"
                        fill-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div
                    class="c20"
                  >
                    <div
                      class="c17"
                    >
                      <span
                        class="c21 c22"
                      >
                        Documentation
                      </span>
                      <svg
                        class="c23 c24"
                        fill="none"
                        height="3"
                        viewBox="0 0 24 24"
                        width="3"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                          fill="#32324D"
                        />
                      </svg>
                    </div>
                    <span
                      class="c25"
                    >
                      Tell us what plugin you are looking for and we'll let our community plugin developers know in case they are in search for inspiration!
                    </span>
                  </div>
                </div>
              </a>
              <div
                class="c26"
                width="25%"
              >
                <div
                  class="c27"
                >
                  <div>
                    <div
                      class="c28"
                    >
                      <label
                        class="c29"
                        for="field-1"
                      >
                        <div
                          class="c30"
                        >
                          Search for a plugin
                        </div>
                      </label>
                    </div>
                    <div
                      class="c31 c32 c33"
                    >
                      <div
                        class="c34"
                      >
                        <div
                          class="c35 c30 c36"
                        >
                          <svg
                            aria-hidden="true"
                            fill="none"
                            height="1em"
                            viewBox="0 0 24 24"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              clip-rule="evenodd"
                              d="M23.813 20.163l-5.3-5.367a9.792 9.792 0 001.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 005.007-1.4l5.275 5.35a.634.634 0 00.913 0l2.706-2.737a.641.641 0 000-.907zM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062z"
                              fill="#32324D"
                              fill-rule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <input
                        aria-disabled="false"
                        aria-invalid="false"
                        class="c37"
                        id="field-1"
                        name="searchbar"
                        placeholder="Search for a plugin"
                        value=""
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c38"
              >
                <div
                  class="c39"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c40 c41"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Comments logo"
                          class="c42"
                          height="11"
                          src="https://dl.airtable.com/.attachments/eb4cd59876565af77c9c3e5966b59f10/2111bfc8/vl_strapi-comments.png"
                          width="11"
                        />
                        <div
                          class="c43"
                        >
                          <h3
                            class="c44"
                          >
                            <div
                              class="c17"
                            >
                              Comments
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c45"
                        >
                          <p
                            class="c25 c46"
                          >
                            Powerful Strapi based comments moderation tool for you and your users
                          </p>
                        </div>
                      </div>
                      <div
                        class="c47 c48 c49"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Comments"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-comments"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c12 c13"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c10 c50"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                        </a>
                        <button
                          aria-disabled="false"
                          class="c51 c52"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c53 c54 c55"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1.056 24h15.906c.583 0 1.056-.473 1.056-1.056V7.028c0-.583-.473-1.056-1.056-1.056H1.056C.473 5.972 0 6.445 0 7.028v15.916C0 23.527.473 24 1.056 24z"
                                fill="#212134"
                              />
                              <path
                                d="M8.094 2.111h13.795v13.795h-1.127v2.112h2.182A1.056 1.056 0 0024 16.962V1.056A1.056 1.056 0 0022.944 0H7.038a1.056 1.056 0 00-1.056 1.056v2.252h2.112V2.11z"
                                fill="#212134"
                              />
                            </svg>
                          </div>
                          <span
                            class="c56 c57"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c39"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c40 c41"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Config Sync logo"
                          class="c42"
                          height="11"
                          src="https://dl.airtable.com/.attachments/e23a7231d12cce89cb4b05cbfe759d45/96f5f496/Screenshot2021-12-09at22.15.37.png"
                          width="11"
                        />
                        <div
                          class="c43"
                        >
                          <h3
                            class="c44"
                          >
                            <div
                              class="c17"
                            >
                              Config Sync
                              <span>
                                <div
                                  aria-describedby="tooltip-1"
                                  class="c17"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c58 c59"
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 24 24"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clip-rule="evenodd"
                                      d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm-1.438-11.066L16.158 7.5 18 9.245l-7.438 7.18-4.462-4.1 1.84-1.745 2.622 2.354z"
                                      fill="#212134"
                                      fill-rule="evenodd"
                                    />
                                  </svg>
                                </div>
                              </span>
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c45"
                        >
                          <p
                            class="c25 c46"
                          >
                            Migrate your config data across environments using the CLI or Strapi admin panel.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c47 c48 c49"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Config Sync"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-config-sync"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c12 c13"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c10 c50"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                        </a>
                        <button
                          aria-disabled="false"
                          class="c51 c52"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c53 c54 c55"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1.056 24h15.906c.583 0 1.056-.473 1.056-1.056V7.028c0-.583-.473-1.056-1.056-1.056H1.056C.473 5.972 0 6.445 0 7.028v15.916C0 23.527.473 24 1.056 24z"
                                fill="#212134"
                              />
                              <path
                                d="M8.094 2.111h13.795v13.795h-1.127v2.112h2.182A1.056 1.056 0 0024 16.962V1.056A1.056 1.056 0 0022.944 0H7.038a1.056 1.056 0 00-1.056 1.056v2.252h2.112V2.11z"
                                fill="#212134"
                              />
                            </svg>
                          </div>
                          <span
                            class="c56 c57"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c39"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c40 c41"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Content Versioning logo"
                          class="c42"
                          height="11"
                          src="https://dl.airtable.com/.attachments/0b86f18e2606ed7f53bd54d536a1bea5/13a87f30/Artboard7copy.png"
                          width="11"
                        />
                        <div
                          class="c43"
                        >
                          <h3
                            class="c44"
                          >
                            <div
                              class="c17"
                            >
                              Content Versioning
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c45"
                        >
                          <p
                            class="c25 c46"
                          >
                            This plugin enables you to versioning Content Types. It allows multiple draft versions✅ Keeps history of all changes (with time travel) ✅ 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c47 c48 c49"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Content Versioning"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@notum-cz-strapi-plugin-content-versioning"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c12 c13"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c10 c50"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                        </a>
                        <button
                          aria-disabled="false"
                          class="c51 c52"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c53 c54 c55"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1.056 24h15.906c.583 0 1.056-.473 1.056-1.056V7.028c0-.583-.473-1.056-1.056-1.056H1.056C.473 5.972 0 6.445 0 7.028v15.916C0 23.527.473 24 1.056 24z"
                                fill="#212134"
                              />
                              <path
                                d="M8.094 2.111h13.795v13.795h-1.127v2.112h2.182A1.056 1.056 0 0024 16.962V1.056A1.056 1.056 0 0022.944 0H7.038a1.056 1.056 0 00-1.056 1.056v2.252h2.112V2.11z"
                                fill="#212134"
                              />
                            </svg>
                          </div>
                          <span
                            class="c56 c57"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c39"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c40 c41"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Documentation logo"
                          class="c42"
                          height="11"
                          src="https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png"
                          width="11"
                        />
                        <div
                          class="c43"
                        >
                          <h3
                            class="c44"
                          >
                            <div
                              class="c17"
                            >
                              Documentation
                              <span>
                                <div
                                  aria-describedby="tooltip-3"
                                  class="c17"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c60"
                                    height="auto"
                                    src="IMAGE_MOCK"
                                    width="6"
                                  />
                                </div>
                              </span>
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c45"
                        >
                          <p
                            class="c25 c46"
                          >
                            Create an OpenAPI Document and visualize your API with SWAGGER UI
                          </p>
                        </div>
                      </div>
                      <div
                        class="c47 c48 c49"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Documentation"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-documentation"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c12 c13"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c10 c50"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                        </a>
                        <div
                          class="c61"
                        >
                          <svg
                            class="c62 c59"
                            fill="none"
                            height="12"
                            viewBox="0 0 24 24"
                            width="12"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                              fill="#212134"
                            />
                          </svg>
                          <span
                            class="c63"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c39"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c40 c41"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Transformer logo"
                          class="c42"
                          height="11"
                          src="https://dl.airtable.com/.attachments/5ffd1782a2fabf423ccd6f56c562f31a/b8f8598f/transformer-logo.png"
                          width="11"
                        />
                        <div
                          class="c43"
                        >
                          <h3
                            class="c44"
                          >
                            <div
                              class="c17"
                            >
                              Transformer
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c45"
                        >
                          <p
                            class="c25 c46"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to transform the API response. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c47 c48 c49"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Transformer"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-transformer"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c12 c13"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c10 c50"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                fill="#32324D"
                              />
                            </svg>
                          </div>
                        </a>
                        <button
                          aria-disabled="false"
                          class="c51 c52"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c53 c54 c55"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1.056 24h15.906c.583 0 1.056-.473 1.056-1.056V7.028c0-.583-.473-1.056-1.056-1.056H1.056C.473 5.972 0 6.445 0 7.028v15.916C0 23.527.473 24 1.056 24z"
                                fill="#212134"
                              />
                              <path
                                d="M8.094 2.111h13.795v13.795h-1.127v2.112h2.182A1.056 1.056 0 0024 16.962V1.056A1.056 1.056 0 0022.944 0H7.038a1.056 1.056 0 00-1.056 1.056v2.252h2.112V2.11z"
                                fill="#212134"
                              />
                            </svg>
                          </div>
                          <span
                            class="c56 c57"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c64"
              >
                <a
                  href="https://strapi.canny.io/plugin-requests"
                  rel="noopener noreferrer nofollow"
                  style="text-decoration: none;"
                  target="_blank"
                >
                  <div
                    class="c16 c17"
                  >
                    <div
                      class="c18 c17 c19"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 32 32"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                          fill="#AC73E6"
                        />
                        <path
                          clip-rule="evenodd"
                          d="M15.027 13.839c-3.19-.836-6.305-1.064-10.18-.608-1.215.152-1.063 1.975.076 2.203.304.836.456 2.355.912 3.267.987 2.279 5.622 1.975 7.369.835 1.14-.683 1.443-2.279 1.9-3.494.227-.684 1.595-.684 1.822 0 .38 1.215.76 2.81 1.9 3.494 1.747 1.14 6.381 1.444 7.369-.835.456-.912.607-2.431.911-3.267 1.14-.228 1.216-2.051.076-2.203-3.874-.456-6.989-.228-10.18.608-.455.075-1.519.075-1.975 0z"
                          fill="#fff"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class="c17"
                      >
                        <span
                          class="c21 c22"
                        >
                          Documentation
                        </span>
                        <svg
                          class="c23 c24"
                          fill="none"
                          height="3"
                          viewBox="0 0 24 24"
                          width="3"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                            fill="#32324D"
                          />
                        </svg>
                      </div>
                      <span
                        class="c25"
                      >
                        Tell us what plugin you are looking for and we'll let our community plugin developers know in case they are in search for inspiration!
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });

  it('sends a single tracking event when the user enters the marketplace', () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementation(() => ({ trackUsage }));
    render(App);

    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
    expect(trackUsage).toHaveBeenCalledTimes(1);
  });

  it('should return search results matching the query', async () => {
    const { container } = render(App);
    const input = await getByPlaceholderText(container, 'Search for a plugin');
    fireEvent.change(input, { target: { value: 'comment' } });
    const match = screen.getByText('Comments');
    const notMatch = screen.queryByText('Sentry');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
  });

  it('should return empty search results given a bad query', async () => {
    const { container } = render(App);
    const input = await getByPlaceholderText(container, 'Search for a plugin');
    const badQuery = 'asdf';
    fireEvent.change(input, { target: { value: badQuery } });
    const noResult = screen.getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('handles production environment', async () => {
    // Simulate production environment
    useAppInfos.mockImplementation(() => ({ autoReload: false }));
    const { queryByText } = render(App);

    // Should display notification
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'info',
      message: {
        id: 'admin.pages.MarketPlacePage.production',
        defaultMessage: 'Manage plugins from the development environment',
      },
      blockTransition: true,
    });
    expect(toggleNotification).toHaveBeenCalledTimes(1);

    // Should not show install buttons
    expect(queryByText(/copy install command/i)).not.toBeInTheDocument();
  });
});
