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
import useNavigatorOnLine from '../../../hooks/useNavigatorOnLine';
import MarketPlacePage from '../index';
import server from './server';

const toggleNotification = jest.fn();

jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));

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
      .c58 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c60 {
        background: #f6ecfc;
        padding: 12px;
        border-radius: 4px;
      }

      .c59 {
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

      .c62 {
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
      }

      .c63 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c64 {
        font-weight: 500;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c68 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c61 {
        margin-right: 24px;
      }

      .c61 svg {
        width: 2rem;
        height: 2rem;
      }

      .c65 {
        word-break: break-all;
      }

      .c29 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c30 {
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

      .c16 {
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

      .c6 {
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

      .c7 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c15 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c25 {
        padding-right: 8px;
        padding-left: 12px;
      }

      .c21 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c20 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c28 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 0;
        padding-right: 16px;
        padding-top: 0.65625rem;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c28::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c28::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c28:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c28::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c28[aria-disabled='true'] {
        color: inherit;
      }

      .c28:focus {
        outline: none;
        box-shadow: none;
      }

      .c24 {
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

      .c24:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c19 {
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

      .c27 {
        font-size: 0.8rem;
      }

      .c27 svg path {
        fill: #32324d;
      }

      .c18 {
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c18:focus-within .c26 svg path {
        fill: #4945ff;
      }

      .c18 .c22 {
        border: 1px solid transparent;
      }

      .c18 .c22:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c17 {
        padding-bottom: 16px;
        width: 25%;
      }

      .c33 {
        border-radius: 4px;
        width: 64px;
        height: 64px;
      }

      .c34 {
        padding-top: 16px;
      }

      .c37 {
        padding-top: 8px;
      }

      .c53 {
        margin-left: 4px;
        width: 24px;
        height: auto;
      }

      .c54 {
        padding-left: 16px;
      }

      .c57 {
        padding-top: 32px;
      }

      .c35 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c38 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c56 {
        font-weight: 600;
        color: #328048;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c31 {
        background: #ffffff;
        padding-top: 16px;
        padding-right: 16px;
        padding-bottom: 16px;
        padding-left: 16px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        height: 100%;
      }

      .c32 {
        -webkit-align-items: normal;
        -webkit-box-align: normal;
        -ms-flex-align: normal;
        align-items: normal;
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
      }

      .c36 {
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

      .c40 {
        padding-top: 24px;
      }

      .c41 {
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

      .c42 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c42 > * + * {
        margin-left: 8px;
      }

      .c14 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c12 {
        padding-right: 8px;
      }

      .c43 {
        padding-left: 8px;
      }

      .c9 {
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

      .c9 svg {
        height: 12px;
        width: 12px;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #ffffff;
      }

      .c9[aria-disabled='true'] {
        pointer-events: none;
      }

      .c9:after {
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

      .c9:focus-visible {
        outline: none;
      }

      .c9:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c8 {
        cursor: pointer;
      }

      .c10 {
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
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

      .c10 .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c10 .c13 {
        color: #ffffff;
      }

      .c10[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true'] .c13 {
        color: #666687;
      }

      .c10[aria-disabled='true'] svg > g,
      .c10[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c10[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true']:active .c13 {
        color: #666687;
      }

      .c10[aria-disabled='true']:active svg > g,
      .c10[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c10:hover {
        background-color: #f6f6f9;
      }

      .c10:active {
        background-color: #eaeaef;
      }

      .c10 .c13 {
        color: #32324d;
      }

      .c10 svg > g,
      .c10 svg path {
        fill: #32324d;
      }

      .c51 {
        color: #328048;
        margin-left: 8px;
      }

      .c55 {
        color: #328048;
        margin-right: 8px;
        width: 12;
        height: 12;
      }

      .c66 {
        color: #666687;
        margin-left: 8px;
        width: 12px;
        height: 12px;
      }

      .c52 path {
        fill: #328048;
      }

      .c67 path {
        fill: #666687;
      }

      .c50 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c47 {
        padding-right: 8px;
      }

      .c44 {
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

      .c44 svg {
        height: 12px;
        width: 12px;
      }

      .c44 svg > g,
      .c44 svg path {
        fill: #ffffff;
      }

      .c44[aria-disabled='true'] {
        pointer-events: none;
      }

      .c44:after {
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

      .c44:focus-visible {
        outline: none;
      }

      .c44:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c48 {
        height: 100%;
      }

      .c45 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
      }

      .c45 .c46 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c45 .c49 {
        color: #ffffff;
      }

      .c45[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c45[aria-disabled='true'] .c49 {
        color: #666687;
      }

      .c45[aria-disabled='true'] svg > g,
      .c45[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c45[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c45[aria-disabled='true']:active .c49 {
        color: #666687;
      }

      .c45[aria-disabled='true']:active svg > g,
      .c45[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c45:hover {
        background-color: #ffffff;
      }

      .c45:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c45:active .c49 {
        color: #4945ff;
      }

      .c45:active svg > g,
      .c45:active svg path {
        fill: #4945ff;
      }

      .c45 .c49 {
        color: #271fe0;
      }

      .c45 svg > g,
      .c45 svg path {
        fill: #271fe0;
      }

      .c39 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      @media (max-width:68.75rem) {
        .c30 {
          grid-column: span 6;
        }
      }

      @media (max-width:34.375rem) {
        .c30 {
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
                    class="c8 c9 c10"
                    href="https://market.strapi.io/submit-plugin"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <div
                      aria-hidden="true"
                      class="c11 c12"
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
                      class="c13 c14"
                    >
                      Submit your plugin
                    </span>
                  </a>
                </div>
                <p
                  class="c15"
                >
                  Get more out of Strapi
                </p>
              </div>
            </div>
            <div
              class="c16"
            >
              <div
                class="c17"
                width="25%"
              >
                <div
                  class="c18"
                >
                  <div>
                    <div
                      class="c19"
                    >
                      <label
                        class="c20"
                        for="field-1"
                      >
                        <div
                          class="c21"
                        >
                          Search for a plugin
                        </div>
                      </label>
                    </div>
                    <div
                      class="c22 c23 c24"
                    >
                      <div
                        class="c25"
                      >
                        <div
                          class="c26 c21 c27"
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
                        class="c28"
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
                class="c29"
              >
                <div
                  class="c30"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c31 c32"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Comments logo"
                          class="c33"
                          height="11"
                          src="https://dl.airtable.com/.attachments/eb4cd59876565af77c9c3e5966b59f10/2111bfc8/vl_strapi-comments.png"
                          width="11"
                        />
                        <div
                          class="c34"
                        >
                          <h3
                            class="c35"
                          >
                            <div
                              class="c36"
                            >
                              Comments
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c37"
                        >
                          <p
                            class="c38 c39"
                          >
                            Powerful Strapi based comments moderation tool for you and your users
                          </p>
                        </div>
                      </div>
                      <div
                        class="c40 c41 c42"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Comments"
                          class="c8 c9 c10"
                          href="https://market.strapi.io/plugins/strapi-plugin-comments"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c13 c14"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c11 c43"
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
                          class="c44 c45"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c46 c47 c48"
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
                            class="c49 c50"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c30"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c31 c32"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Config Sync logo"
                          class="c33"
                          height="11"
                          src="https://dl.airtable.com/.attachments/e23a7231d12cce89cb4b05cbfe759d45/96f5f496/Screenshot2021-12-09at22.15.37.png"
                          width="11"
                        />
                        <div
                          class="c34"
                        >
                          <h3
                            class="c35"
                          >
                            <div
                              class="c36"
                            >
                              Config Sync
                              <span>
                                <div
                                  aria-describedby="tooltip-1"
                                  class="c36"
                                  tabindex="0"
                                >
                                  <svg
                                    class="c51 c52"
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
                          class="c37"
                        >
                          <p
                            class="c38 c39"
                          >
                            Migrate your config data across environments using the CLI or Strapi admin panel.
                          </p>
                        </div>
                      </div>
                      <div
                        class="c40 c41 c42"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Config Sync"
                          class="c8 c9 c10"
                          href="https://market.strapi.io/plugins/strapi-plugin-config-sync"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c13 c14"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c11 c43"
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
                          class="c44 c45"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c46 c47 c48"
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
                            class="c49 c50"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c30"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c31 c32"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Content Versioning logo"
                          class="c33"
                          height="11"
                          src="https://dl.airtable.com/.attachments/0b86f18e2606ed7f53bd54d536a1bea5/13a87f30/Artboard7copy.png"
                          width="11"
                        />
                        <div
                          class="c34"
                        >
                          <h3
                            class="c35"
                          >
                            <div
                              class="c36"
                            >
                              Content Versioning
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c37"
                        >
                          <p
                            class="c38 c39"
                          >
                            This plugin enables you to versioning Content Types. It allows multiple draft versions✅ Keeps history of all changes (with time travel) ✅ 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c40 c41 c42"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Content Versioning"
                          class="c8 c9 c10"
                          href="https://market.strapi.io/plugins/@notum-cz-strapi-plugin-content-versioning"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c13 c14"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c11 c43"
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
                          class="c44 c45"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c46 c47 c48"
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
                            class="c49 c50"
                          >
                            Copy install command
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c30"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c31 c32"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Documentation logo"
                          class="c33"
                          height="11"
                          src="https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png"
                          width="11"
                        />
                        <div
                          class="c34"
                        >
                          <h3
                            class="c35"
                          >
                            <div
                              class="c36"
                            >
                              Documentation
                              <span>
                                <div
                                  aria-describedby="tooltip-3"
                                  class="c36"
                                  tabindex="0"
                                >
                                  <img
                                    alt="Made by Strapi"
                                    class="c53"
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
                          class="c37"
                        >
                          <p
                            class="c38 c39"
                          >
                            Create an OpenAPI Document and visualize your API with SWAGGER UI
                          </p>
                        </div>
                      </div>
                      <div
                        class="c40 c41 c42"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Documentation"
                          class="c8 c9 c10"
                          href="https://market.strapi.io/plugins/@strapi-plugin-documentation"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c13 c14"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c11 c43"
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
                          class="c54"
                        >
                          <svg
                            class="c55 c52"
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
                            class="c56"
                          >
                            Installed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c30"
                >
                  <div
                    class=""
                    style="height: 100%;"
                  >
                    <div
                      class="c31 c32"
                      height="100%"
                    >
                      <div
                        class=""
                      >
                        <img
                          alt="Transformer logo"
                          class="c33"
                          height="11"
                          src="https://dl.airtable.com/.attachments/5ffd1782a2fabf423ccd6f56c562f31a/b8f8598f/transformer-logo.png"
                          width="11"
                        />
                        <div
                          class="c34"
                        >
                          <h3
                            class="c35"
                          >
                            <div
                              class="c36"
                            >
                              Transformer
                            </div>
                          </h3>
                        </div>
                        <div
                          class="c37"
                        >
                          <p
                            class="c38 c39"
                          >
                            A plugin for Strapi Headless CMS that provides the ability to transform the API response. 
                          </p>
                        </div>
                      </div>
                      <div
                        class="c40 c41 c42"
                        spacing="2"
                        style="align-self: flex-end;"
                      >
                        <a
                          aria-disabled="false"
                          aria-label="Learn more about Transformer"
                          class="c8 c9 c10"
                          href="https://market.strapi.io/plugins/strapi-plugin-transformer"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c13 c14"
                          >
                            Learn more
                          </span>
                          <div
                            aria-hidden="true"
                            class="c11 c43"
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
                          class="c44 c45"
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            class="c46 c47 c48"
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
                            class="c49 c50"
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
                class="c57"
              >
                <a
                  href="https://strapi.canny.io/plugin-requests"
                  rel="noopener noreferrer nofollow"
                  style="text-decoration: none;"
                  target="_blank"
                >
                  <div
                    class="c58 c59"
                  >
                    <div
                      class="c60 c59 c61"
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
                      class="c62 c63"
                    >
                      <div
                        class="c59"
                      >
                        <span
                          class="c64 c65"
                        >
                          Documentation
                        </span>
                        <svg
                          class="c66 c67"
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
                        class="c68"
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

  it('handles production environment', () => {
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

  it('shows an online layout', () => {
    render(App);
    const offlineText = screen.queryByText('You are offline');

    expect(offlineText).toEqual(null);
  });

  it('shows the offline layout', () => {
    useNavigatorOnLine.mockReturnValueOnce(false);
    render(App);
    const offlineText = screen.getByText('You are offline');

    expect(offlineText).toBeVisible();
  });
});
