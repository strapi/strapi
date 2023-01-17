import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import ProtectedEmailTemplatesPage from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
  useTracking: jest.fn(() => ({
    trackUsage: jest.fn(),
  })),
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
    <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
      <ThemeProvider theme={lightTheme}>
        <ProtectedEmailTemplatesPage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('ADMIN | Pages | Settings | Email Templates', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    jest.resetAllMocks();
    server.close();
  });

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true },
    }));

    const { container } = render(App);
    await waitFor(() => {
      expect(screen.getByText('Reset password')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c16 {
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

      .c6 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c9 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c14 {
        width: 1%;
      }

      .c20 {
        color: #666687;
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
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c18 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
      }

      .c22 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c23 {
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

      .c23 svg {
        height: 12px;
        width: 12px;
      }

      .c23 svg > g,
      .c23 svg path {
        fill: #ffffff;
      }

      .c23[aria-disabled='true'] {
        pointer-events: none;
      }

      .c23:after {
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

      .c23:focus-visible {
        outline: none;
      }

      .c23:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c7 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c11 {
        width: 100%;
        white-space: nowrap;
      }

      .c8 {
        position: relative;
      }

      .c8:before {
        background: linear-gradient(90deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c8:after {
        background: linear-gradient(270deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c10 {
        overflow-x: auto;
      }

      .c19 tr:last-of-type {
        border-bottom: none;
      }

      .c12 {
        border-bottom: 1px solid #eaeaef;
      }

      .c13 {
        border-bottom: 1px solid #eaeaef;
      }

      .c13 td,
      .c13 th {
        padding: 16px;
      }

      .c13 td:first-of-type,
      .c13 th:first-of-type {
        padding: 0 4px;
      }

      .c13 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 3.5rem;
      }

      .c15 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c15 input {
        vertical-align: sub;
      }

      .c17 svg {
        height: 0.25rem;
      }

      .c24 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 2rem;
        width: 2rem;
        border: none;
      }

      .c24 svg > g,
      .c24 svg path {
        fill: #8e8ea9;
      }

      .c24:hover svg > g,
      .c24:hover svg path {
        fill: #666687;
      }

      .c24:active svg > g,
      .c24:active svg path {
        fill: #a5a5ba;
      }

      .c24[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c24[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c21 path {
        fill: #666687;
      }

      .c0:focus-visible {
        outline: none;
      }

      <main
        aria-busy="false"
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
                  Email templates
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
              class="c8"
            >
              <div
                class="c9 c10"
              >
                <table
                  aria-colcount="3"
                  aria-rowcount="3"
                  class="c11"
                  role="grid"
                >
                  <thead
                    class="c12"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c13"
                    >
                      <th
                        aria-colindex="1"
                        class="c14 c15"
                        role="gridcell"
                        tabindex="0"
                        width="1%"
                      >
                        <div
                          class="c3"
                        >
                          <div
                            class="c16"
                          >
                            icon
                          </div>
                          <span
                            class="c17"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c15"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c3"
                        >
                          <span
                            class="c18"
                          >
                            name
                          </span>
                          <span
                            class="c17"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c14 c15"
                        role="gridcell"
                        tabindex="-1"
                        width="1%"
                      >
                        <div
                          class="c3"
                        >
                          <div
                            class="c16"
                          >
                            action
                          </div>
                          <span
                            class="c17"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c19"
                  >
                    <tr
                      aria-rowindex="2"
                      class="c13"
                      style="cursor: pointer;"
                    >
                      <td
                        aria-colindex="1"
                        class="c15"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c20 c21"
                        >
                          <svg
                            aria-label="Reset password"
                            fill="none"
                            height="1em"
                            viewBox="0 0 24 24"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              clip-rule="evenodd"
                              d="M15.681 2.804A9.64 9.64 0 0011.818 2C6.398 2 2 6.48 2 12c0 5.521 4.397 10 9.818 10 2.03 0 4.011-.641 5.67-1.835a9.987 9.987 0 003.589-4.831 1.117 1.117 0 00-.664-1.418 1.086 1.086 0 00-1.393.676 7.769 7.769 0 01-2.792 3.758 7.546 7.546 0 01-4.41 1.428V4.222h.002a7.492 7.492 0 013.003.625 7.61 7.61 0 012.5 1.762l.464.551-2.986 3.042a.186.186 0 00.129.316H22V3.317a.188.188 0 00-.112-.172.179.179 0 00-.199.04l-2.355 2.4-.394-.468-.02-.02a9.791 9.791 0 00-3.239-2.293zm-3.863 1.418V2v2.222zm0 0v15.556c-4.216 0-7.636-3.484-7.636-7.778s3.42-7.777 7.636-7.778z"
                              fill="#212134"
                              fill-rule="evenodd"
                            />
                          </svg>
                        </div>
                      </td>
                      <td
                        aria-colindex="2"
                        class="c15"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c22"
                        >
                          Reset password
                        </span>
                      </td>
                      <td
                        aria-colindex="3"
                        aria-hidden="true"
                        class="c15"
                        role="button"
                      >
                        <span>
                          <button
                            aria-disabled="false"
                            aria-labelledby="tooltip-1"
                            class="c23 c24"
                            tabindex="-1"
                            type="button"
                          >
                            <span
                              class="c16"
                            >
                              Edit a template
                            </span>
                            <svg
                              aria-hidden="true"
                              fill="none"
                              focusable="false"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                clip-rule="evenodd"
                                d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                fill="#212134"
                                fill-rule="evenodd"
                              />
                            </svg>
                          </button>
                        </span>
                      </td>
                    </tr>
                    <tr
                      aria-rowindex="3"
                      class="c13"
                      style="cursor: pointer;"
                    >
                      <td
                        aria-colindex="1"
                        class="c15"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c20 c21"
                        >
                          <svg
                            aria-label="Email address confirmation"
                            fill="none"
                            height="1em"
                            viewBox="0 0 24 24"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20.727 2.97a.2.2 0 01.286 0l2.85 2.89a.2.2 0 010 .28L9.554 20.854a.2.2 0 01-.285 0l-9.13-9.243a.2.2 0 010-.281l2.85-2.892a.2.2 0 01.284 0l6.14 6.209L20.726 2.97z"
                              fill="#212134"
                            />
                          </svg>
                        </div>
                      </td>
                      <td
                        aria-colindex="2"
                        class="c15"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c22"
                        >
                          Email address confirmation
                        </span>
                      </td>
                      <td
                        aria-colindex="3"
                        aria-hidden="true"
                        class="c15"
                        role="button"
                      >
                        <span>
                          <button
                            aria-disabled="false"
                            aria-labelledby="tooltip-3"
                            class="c23 c24"
                            tabindex="-1"
                            type="button"
                          >
                            <span
                              class="c16"
                            >
                              Edit a template
                            </span>
                            <svg
                              aria-hidden="true"
                              fill="none"
                              focusable="false"
                              height="1em"
                              viewBox="0 0 24 24"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                clip-rule="evenodd"
                                d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                fill="#212134"
                                fill-rule="evenodd"
                              />
                            </svg>
                          </button>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    `);
  });
});
