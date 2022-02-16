import React from 'react';
import { render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
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
      .c11 {
        background: #ffffff;
        padding: 20px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c28 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c30 {
        padding-left: 8px;
      }

      .c25 {
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

      .c25 svg {
        height: 12px;
        width: 12px;
      }

      .c25 svg > g,
      .c25 svg path {
        fill: #ffffff;
      }

      .c25[aria-disabled='true'] {
        pointer-events: none;
      }

      .c25:after {
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

      .c25:focus-visible {
        outline: none;
      }

      .c25:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c26 {
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

      .c26 .c29 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c26 .c27 {
        color: #ffffff;
      }

      .c26[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true'] .c27 {
        color: #666687;
      }

      .c26[aria-disabled='true'] svg > g,
      .c26[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c26[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true']:active .c27 {
        color: #666687;
      }

      .c26[aria-disabled='true']:active svg > g,
      .c26[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c26:hover {
        background-color: #ffffff;
      }

      .c26:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c26:active .c27 {
        color: #4945ff;
      }

      .c26:active svg > g,
      .c26:active svg path {
        fill: #4945ff;
      }

      .c26 .c27 {
        color: #271fe0;
      }

      .c26 svg > g,
      .c26 svg path {
        fill: #271fe0;
      }

      .c13 {
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
        -webkit-align-items: flex-end;
        -webkit-box-align: flex-end;
        -ms-flex-align: flex-end;
        align-items: flex-end;
      }

      .c16 {
        padding-top: 12px;
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

      .c18 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c18 > * + * {
        margin-left: 8px;
      }

      .c14 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c15 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
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

      .c9 {
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

      .c8 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c22 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c24 {
        padding-left: 8px;
      }

      .c19 {
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

      .c19 svg {
        height: 12px;
        width: 12px;
      }

      .c19 svg > g,
      .c19 svg path {
        fill: #ffffff;
      }

      .c19[aria-disabled='true'] {
        pointer-events: none;
      }

      .c19:after {
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

      .c19:focus-visible {
        outline: none;
      }

      .c19:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c20 {
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

      .c20 .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c20 .c21 {
        color: #ffffff;
      }

      .c20[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c20[aria-disabled='true'] .c21 {
        color: #666687;
      }

      .c20[aria-disabled='true'] svg > g,
      .c20[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c20[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c20[aria-disabled='true']:active .c21 {
        color: #666687;
      }

      .c20[aria-disabled='true']:active svg > g,
      .c20[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c20:hover {
        background-color: #f6f6f9;
      }

      .c20:active {
        background-color: #eaeaef;
      }

      .c20 .c21 {
        color: #32324d;
      }

      .c20 svg > g,
      .c20 svg path {
        fill: #32324d;
      }

      .c12 .logo {
        display: block;
        width: 64px;
        height: 64px;
        object-fit: contain;
        border-radius: 6px;
      }

      .c12 .name {
        display: block;
        margin-top: 20px;
      }

      .c12 .description {
        margin-top: 12px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      .c10 {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(400px,1fr));
        grid-gap: 16px;
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
                </div>
                <p
                  class="c8"
                >
                  Get more out of Strapi
                </p>
              </div>
            </div>
            <div
              class="c9"
            >
              <div
                class="c10"
              >
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                    style="height: 100%;"
                  >
                    <div
                      style="width: 100%;"
                    >
                      <img
                        alt="Comments logo"
                        class="logo"
                        src="https://dl.airtable.com/.attachments/eb4cd59876565af77c9c3e5966b59f10/2111bfc8/vl_strapi-comments.png"
                      />
                      <span
                        class="c14 name"
                      >
                        Comments
                      </span>
                      <span
                        class="c15 description"
                      >
                        Powerful Strapi based comments moderation tool for you and your users
                      </span>
                    </div>
                    <div
                      class="c16 c17 c18"
                    >
                      <a
                        aria-disabled="false"
                        class="c19 c20"
                        href="https://market.strapi.io/plugins/strapi-plugin-comments"
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span
                          class="c21 c22"
                        >
                          Learn more
                        </span>
                        <div
                          aria-hidden="true"
                          class="c23 c24"
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
                        class="c25 c26"
                        type="button"
                      >
                        <span
                          class="c27 c28"
                        >
                          Copy install command
                        </span>
                        <div
                          aria-hidden="true"
                          class="c29 c30"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                    style="height: 100%;"
                  >
                    <div
                      style="width: 100%;"
                    >
                      <img
                        alt="Config Sync logo"
                        class="logo"
                        src="https://dl.airtable.com/.attachments/e23a7231d12cce89cb4b05cbfe759d45/96f5f496/Screenshot2021-12-09at22.15.37.png"
                      />
                      <span
                        class="c14 name"
                      >
                        Config Sync
                      </span>
                      <span
                        class="c15 description"
                      >
                        Migrate your config data across environments using the CLI or Strapi admin panel.
                      </span>
                    </div>
                    <div
                      class="c16 c17 c18"
                    >
                      <a
                        aria-disabled="false"
                        class="c19 c20"
                        href="https://market.strapi.io/plugins/strapi-plugin-config-sync"
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span
                          class="c21 c22"
                        >
                          Learn more
                        </span>
                        <div
                          aria-hidden="true"
                          class="c23 c24"
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
                        class="c25 c26"
                        type="button"
                      >
                        <span
                          class="c27 c28"
                        >
                          Copy install command
                        </span>
                        <div
                          aria-hidden="true"
                          class="c29 c30"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                    style="height: 100%;"
                  >
                    <div
                      style="width: 100%;"
                    >
                      <img
                        alt="Content Versioning logo"
                        class="logo"
                        src="https://dl.airtable.com/.attachments/0b86f18e2606ed7f53bd54d536a1bea5/13a87f30/Artboard7copy.png"
                      />
                      <span
                        class="c14 name"
                      >
                        Content Versioning
                      </span>
                      <span
                        class="c15 description"
                      >
                        This plugin enables you to versioning Content Types. It allows multiple draft versions✅ Keeps history of all changes (with time travel) ✅ 
                      </span>
                    </div>
                    <div
                      class="c16 c17 c18"
                    >
                      <a
                        aria-disabled="false"
                        class="c19 c20"
                        href="https://market.strapi.io/plugins/@notum-cz-strapi-plugin-content-versioning"
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span
                          class="c21 c22"
                        >
                          Learn more
                        </span>
                        <div
                          aria-hidden="true"
                          class="c23 c24"
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
                        class="c25 c26"
                        type="button"
                      >
                        <span
                          class="c27 c28"
                        >
                          Copy install command
                        </span>
                        <div
                          aria-hidden="true"
                          class="c29 c30"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                    style="height: 100%;"
                  >
                    <div
                      style="width: 100%;"
                    >
                      <img
                        alt="Documentation logo"
                        class="logo"
                        src="https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png"
                      />
                      <span
                        class="c14 name"
                      >
                        Documentation
                      </span>
                      <span
                        class="c15 description"
                      >
                        Create an OpenAPI Document and visualize your API with SWAGGER UI
                      </span>
                    </div>
                    <div
                      class="c16 c17 c18"
                    >
                      <a
                        aria-disabled="false"
                        class="c19 c20"
                        href="https://market.strapi.io/plugins/@strapi-plugin-documentation"
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span
                          class="c21 c22"
                        >
                          Learn more
                        </span>
                        <div
                          aria-hidden="true"
                          class="c23 c24"
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
                        class="c25 c26"
                        type="button"
                      >
                        <span
                          class="c27 c28"
                        >
                          Copy install command
                        </span>
                        <div
                          aria-hidden="true"
                          class="c29 c30"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                    style="height: 100%;"
                  >
                    <div
                      style="width: 100%;"
                    >
                      <img
                        alt="Transformer logo"
                        class="logo"
                        src="https://dl.airtable.com/.attachments/5ffd1782a2fabf423ccd6f56c562f31a/b8f8598f/transformer-logo.png"
                      />
                      <span
                        class="c14 name"
                      >
                        Transformer
                      </span>
                      <span
                        class="c15 description"
                      >
                        A plugin for Strapi Headless CMS that provides the ability to transform the API response. 
                      </span>
                    </div>
                    <div
                      class="c16 c17 c18"
                    >
                      <a
                        aria-disabled="false"
                        class="c19 c20"
                        href="https://market.strapi.io/plugins/strapi-plugin-transformer"
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span
                          class="c21 c22"
                        >
                          Learn more
                        </span>
                        <div
                          aria-hidden="true"
                          class="c23 c24"
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
                        class="c25 c26"
                        type="button"
                      >
                        <span
                          class="c27 c28"
                        >
                          Copy install command
                        </span>
                        <div
                          aria-hidden="true"
                          class="c29 c30"
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
                      </button>
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

  it('sends an event when the user enters the marketplace', () => {
    const trackUsage = jest.fn();
    useTracking.mockImplementation(() => ({ trackUsage }));
    render(App);

    expect(trackUsage).toHaveBeenCalledWith('didGoToMarketplace');
  });
});
