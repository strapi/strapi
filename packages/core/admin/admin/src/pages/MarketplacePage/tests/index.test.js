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
import { useTracking } from '@strapi/helper-plugin';
import MarketPlacePage from '../index';
import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  pxToRem: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
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
      .c16 {
        padding-bottom: 16px;
        width: 25%;
      }

      .c32 {
        border-radius: 4px;
        width: 64px;
        height: 64px;
      }

      .c33 {
        padding-top: 16px;
      }

      .c38 {
        padding-top: 8px;
      }

      .c52 {
        margin-left: 4px;
        width: 24px;
        height: auto;
      }

      .c53 {
        padding-left: 16px;
      }

      .c51 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c48 {
        padding-right: 8px;
      }

      .c45 {
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

      .c45 svg {
        height: 12px;
        width: 12px;
      }

      .c45 svg > g,
      .c45 svg path {
        fill: #ffffff;
      }

      .c45[aria-disabled='true'] {
        pointer-events: none;
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

      .c49 {
        height: 100%;
      }

      .c46 {
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

      .c46 .c47 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c46 .c50 {
        color: #ffffff;
      }

      .c46[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c46[aria-disabled='true'] .c50 {
        color: #666687;
      }

      .c46[aria-disabled='true'] svg > g,
      .c46[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c46[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c46[aria-disabled='true']:active .c50 {
        color: #666687;
      }

      .c46[aria-disabled='true']:active svg > g,
      .c46[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c46:hover {
        background-color: #ffffff;
      }

      .c46:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c46:active .c50 {
        color: #4945ff;
      }

      .c46:active svg > g,
      .c46:active svg path {
        fill: #4945ff;
      }

      .c46 .c50 {
        color: #271fe0;
      }

      .c46 svg > g,
      .c46 svg path {
        fill: #271fe0;
      }

      .c30 {
        background: #ffffff;
        padding-top: 16px;
        padding-right: 24px;
        padding-bottom: 16px;
        padding-left: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        height: 100%;
      }

      .c31 {
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

      .c35 {
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

      .c36 {
        color: #328048;
        margin-left: 8px;
      }

      .c54 {
        color: #328048;
        margin-right: 8px;
        width: 12;
        height: 12;
      }

      .c37 path {
        fill: #328048;
      }

      .c24 {
        padding-right: 8px;
        padding-left: 12px;
      }

      .c20 {
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

      .c22 {
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

      .c19 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c27 {
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

      .c27::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c27[aria-disabled='true'] {
        color: inherit;
      }

      .c27:focus {
        outline: none;
        box-shadow: none;
      }

      .c23 {
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

      .c23:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c18 {
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

      .c26 {
        font-size: 0.8rem;
      }

      .c26 svg path {
        fill: #32324d;
      }

      .c17 {
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c17:focus-within .c25 svg path {
        fill: #4945ff;
      }

      .c17 .c21 {
        border: 1px solid transparent;
      }

      .c17 .c21:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c41 {
        padding-top: 24px;
      }

      .c42 {
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

      .c43 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c43 > * + * {
        margin-left: 8px;
      }

      .c34 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c39 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c55 {
        font-weight: 600;
        color: #328048;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c28 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c29 {
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

      .c44 {
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

      .c40 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      @media (max-width:68.75rem) {
        .c29 {
          grid-column: span 6;
        }
      }

      @media (max-width:34.375rem) {
        .c29 {
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
              <div
                class="c16"
                width="25%"
              >
                <div
                  class="c17"
                >
                  <div>
                    <div
                      class="c18"
                    >
                      <label
                        class="c19"
                        for="field-1"
                      >
                        <div
                          class="c20"
                        >
                          Search for a plugin
                        </div>
                      </label>
                    </div>
                    <div
                      class="c21 c22 c23"
                    >
                      <div
                        class="c24"
                      >
                        <div
                          class="c25 c20 c26"
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
                        class="c27"
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
                class="c28"
              >
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Comments logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/eb4cd59876565af77c9c3e5966b59f10/2111bfc8/vl_strapi-comments.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Comments
                              <span>
                                <div
                                  aria-describedby="tooltip-1"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Powerful Strapi based comments moderation tool for you and your users
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Config Sync logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/e23a7231d12cce89cb4b05cbfe759d45/96f5f496/Screenshot2021-12-09at22.15.37.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Config Sync
                              <span>
                                <div
                                  aria-describedby="tooltip-3"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Migrate your config data across environments using the CLI or Strapi admin panel.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Content Versioning logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/0b86f18e2606ed7f53bd54d536a1bea5/13a87f30/Artboard7copy.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Content Versioning
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            This plugin enables content versioning.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="DeepL logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/48aeaaa64b52ecc05d7c42d5fa58592b/8a277b42/deepl-logo-blue.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              DeepL
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Integration with the DeepL-API to provide quick automated translation of content fields
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about DeepL"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-deepl"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Documentation logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Documentation
                              <span>
                                <div
                                  aria-describedby="tooltip-5"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Create an OpenAPI Document and visualize your API with SWAGGER UI
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
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
                            class="c10 c44"
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
                          class="c53"
                        >
                          <svg
                            class="c54 c37"
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
                            class="c55"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Email Designer logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/69216d074c5bee89866bda553e658abc/a6fc4ae6/email-designer-icon.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Email Designer
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Design your own email templates directly from the admin panel and use the magic to send programmatically email from your controllers / services.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Email Designer"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-email-designer"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Entity Relationship Chart logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/854647efd1c8942df6071108aa42e576/a7f89388/160.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Entity Relationship Chart
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Generates and displays Entity Relationship Diagram of all Strapi models, fields and relations.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Entity Relationship Chart"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-entity-relationship-chart"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="EZ Forms logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/cd916c4f8065799710962c08ae21e795/9eeeccd9/EZForms.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              EZ Forms
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            This plugin allows you to easily consume forms from your front end and automatically reject spam, send out notifications, and store the data in your database.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about EZ Forms"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-ezforms"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Gatsby Preview logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/63d4628fdf2c15c0daa343c1df1b964e/74c1a508/Gatsby-logo.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Gatsby Preview
                              <span>
                                <div
                                  aria-describedby="tooltip-7"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            The official plugin to integrate Strapi with Gatsby Cloud
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Gatsby Preview"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-gatsby-preview"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="GraphQL logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/089c61fcb87f4b158e7ec602b0878666/1b7f4122/graphql.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              GraphQL
                              <span>
                                <div
                                  aria-describedby="tooltip-9"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Adds GraphQL endpoint with default API methods.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about GraphQL"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-graphql"
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
                            class="c10 c44"
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
                          class="c53"
                        >
                          <svg
                            class="c54 c37"
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
                            class="c55"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Internationalization (i18n) logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/41aa19ed064e03a856c9ad0c0e406d4b/84ed8c9d/globe.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Internationalization (i18n)
                              <span>
                                <div
                                  aria-describedby="tooltip-11"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            The Internationalization (i18n) plugin allows Strapi users to create, manage and distribute localized content in different languages, called "locales".
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Internationalization (i18n)"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-i18n"
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
                            class="c10 c44"
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
                          class="c53"
                        >
                          <svg
                            class="c54 c37"
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
                            class="c55"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Measurement Protocol logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/ec0b48056669ec3e03e40e7f5e514b41/536ab075/measurement-protocol.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Measurement Protocol
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Send data to Google Analytics with Measurement Protocol.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Measurement Protocol"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-measurement-protocol"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Menus logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/1ed36c74312507853740287860035919/4665ecd0/logo.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Menus
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Customize the structure of menus and menu items, typically to render a navigation menu on a frontend app.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Menus"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-menus"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Migrations logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/d43ca42a3544cac844f55d929a24c57b/ce8ceb21/Fichier5-100.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Migrations
                              <span>
                                <div
                                  aria-describedby="tooltip-13"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin to initialize or update automatically your data for all of your environments
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Migrations"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-migrations"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Moesif logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/2744c529ed355f02d347189c16e3f9d5/9d492f63/download1.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Moesif
                              <span>
                                <div
                                  aria-describedby="tooltip-15"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Add Moesif API Analytics and Monitoring to Strapi
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Moesif"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-moesif"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Mux Video Uploader logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/aeb71ee6f1c0a8055ce53164307beed9/182e2ca4/mux-logo-160.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Mux Video Uploader
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for uploading video and audio files to Mux (https://www.mux.com) and managing them within Strapi.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Mux Video Uploader"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-mux-video-uploader"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Navigation logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/6b3aebdd277f97f58b811d4d3beb5b7a/10404b8b/navigation.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Navigation
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Create consumable navigation with a simple and straightforward visual builder
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Navigation"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-navigation"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Notes logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/85c36b1eca1ca457ce37d6a0dc46f387/e6a706ee/logo-notes.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Notes
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to add notes to entity records. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Notes"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-notes"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Passwordless logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/67fcf89bc15119f588567654546c4b30/f19bd6a5/passworless-logo.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Passwordless
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Enables a secure and seamless emailed link authentication experience.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Passwordless"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-passwordless"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Preview Button logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/79025b7c6d4d72436c1ad853afe75611/21be9157/logo.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Preview Button
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Add a preview button and live view button to the content manager edit view to connect with your frontend app.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Preview Button"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-preview-button"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Publisher logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/5d1dde259f76bc8076c093141da343e3/c4287a01/logo-publisher.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Publisher
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to schedule publishing for any content type.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Publisher"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-publisher"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="REST Cache logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/427fcde1d9791d017c98bb03caa0e274/f8189e9d/rest-cache.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              REST Cache
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Speed-up HTTP requests with LRU cache
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about REST Cache"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-rest-cache"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Scheduler logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/ef32eb851950819b11c9ef833c421123/a7637824/strapi-plugin-icon.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Scheduler
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            This plugin allows you to publish or depublish any collection type in the future.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Scheduler"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@webbio-strapi-plugin-scheduler"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Sentry logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/40568860b2765cba0b22ddf4761e8cc3/5a06ef7f/sentry.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Sentry
                              <span>
                                <div
                                  aria-describedby="tooltip-17"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Track your Strapi errors in Sentry
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Sentry"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-sentry"
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
                            class="c10 c44"
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
                          class="c53"
                        >
                          <svg
                            class="c54 c37"
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
                            class="c55"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="SEO logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/da2757a154f0af9378be0916d92d6dfa/eee7a19b/seo-logo.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              SEO
                              <span>
                                <div
                                  aria-describedby="tooltip-19"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c52"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            The official plugin to make your Strapi content SEO friendly
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about SEO"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/@strapi-plugin-seo"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Sitemap logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/9c956c2d2b46c348465cac2091eb851c/fa7601b7/Screenshot2021-12-18at11.17.23.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Sitemap
                              <span>
                                <div
                                  aria-describedby="tooltip-21"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            Generate a highly customizable sitemap XML
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Sitemap"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-sitemap"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Slugify logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/ba203d42274b877ddfe1ac0bf4034c04/275356e2/logo-slugify.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Slugify
                              <span>
                                <div
                                  aria-describedby="tooltip-23"
                                  class="c35"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c36 c37"
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
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to auto slugify a field for any content type. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Slugify"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-slugify"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Tiptap editor logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/c14641a99006b7c4bd4056339d864f71/deabe93b/strapi-editor-logo.jpg"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Tiptap editor
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            It's a dead simple, and easy to use drop-in replacement for the built in strapi WYSIWYG editor. It's build upon the TipTap editor. It saves as plain HTML, making it easy to use with various frontends.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Tiptap editor"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-tiptap-editor"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Transformer logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/490bddc3b5bcfc5dd1a218edd34ea3f7/4acb8119/logo-transformer.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Transformer
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to transform the API response. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c29"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c30 c31"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Website Builder logo"
                          class="c32"
                          height="11"
                          src="https://dl.airtable.com/.attachments/5232b4caa6f6b1fb90092b6711b42f0b/9d2aad9c/logo-webiste-builder.png"
                          width="11"
                        />
                        <div
                          class="c33"
                        >
                          <h3
                            class="c34"
                          >
                            <div
                              class="c35"
                            >
                              Website Builder
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c38"
                        >
                          <p
                            class="c39 c40"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to trigger website builds manually, periodically or through model events. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c41 c42 c43"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Website Builder"
                          class="c8 c9"
                          href="https://market.strapi.io/plugins/strapi-plugin-website-builder"
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
                            class="c10 c44"
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
                          class="c45 c46"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c47 c48 c49"
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
                            class="c50 c51"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
    fireEvent.change(input, { target: { value: 'documentation' } });
    const match = screen.getByText('Documentation');
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
});
