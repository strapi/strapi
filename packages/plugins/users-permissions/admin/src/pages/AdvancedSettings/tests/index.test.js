import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import ProtectedAdvancedSettingsPage from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  CheckPagePermissions: ({ children }) => children,
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
        <ProtectedAdvancedSettingsPage />
      </ThemeProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('ADMIN | Pages | Settings | Advanced Settings', () => {
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
      expect(screen.getByText('Default role for authenticated users')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c14 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c11 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c8 {
        padding-right: 8px;
      }

      .c5 {
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

      .c5 svg {
        height: 12px;
        width: 12px;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #ffffff;
      }

      .c5[aria-disabled='true'] {
        pointer-events: none;
      }

      .c5:after {
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

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-visible:after {
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
        height: 100%;
      }

      .c6 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 10px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
      }

      .c6 .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c6 .c10 {
        color: #ffffff;
      }

      .c6[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c6[aria-disabled='true'] svg > g,
      .c6[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c6[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c6[aria-disabled='true']:active svg > g,
      .c6[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c6:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c6:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c6 svg > g,
      .c6 svg path {
        fill: #ffffff;
      }

      .c25 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c25:focus {
        outline: none;
      }

      .c25[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c28 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c30 {
        padding-left: 12px;
      }

      .c20 {
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
      }

      .c26 {
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

      .c22 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c29 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c33 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c21 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c21 > * + * {
        margin-top: 4px;
      }

      .c24 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2.5rem;
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

      .c31 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c31 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c31 svg path {
        fill: #666687;
      }

      .c32 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c32 svg {
        width: 0.375rem;
      }

      .c27 {
        width: 100%;
      }

      .c15 {
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

      .c16 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c16 > * + * {
        margin-top: 16px;
      }

      .c52 {
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

      .c55 {
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

      .c56 {
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

      .c54 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c59 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c58 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 0.65625rem;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c58::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c58::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c58:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c58::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c58[aria-disabled='true'] {
        color: inherit;
      }

      .c58:focus {
        outline: none;
        box-shadow: none;
      }

      .c61 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 0.65625rem;
        cursor: not-allowed;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c61::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c61::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c61:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c61::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c61[aria-disabled='true'] {
        color: inherit;
      }

      .c61:focus {
        outline: none;
        box-shadow: none;
      }

      .c57 {
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

      .c57:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c60 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        color: #666687;
        background: #eaeaef;
      }

      .c60:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c53 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c53 > * + * {
        margin-top: 4px;
      }

      .c42 {
        background: #f6f6f9;
        padding: 4px;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #dcdce4;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
      }

      .c44 {
        padding-right: 32px;
        padding-left: 32px;
        border-radius: 4px;
      }

      .c36 {
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

      .c38 {
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

      .c39 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c46 {
        font-weight: 600;
        color: #b72b1a;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c48 {
        font-weight: 600;
        color: #666687;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c50 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c37 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c37 > * + * {
        margin-top: 4px;
      }

      .c41 {
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

      .c40 {
        position: relative;
        display: inline-block;
      }

      .c43 {
        height: 2.5rem;
        overflow: hidden;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c43:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c45 {
        background-color: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
      }

      .c47 {
        background-color: transparent;
        border: 1px solid #f6f6f9;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
      }

      .c49 {
        height: 100%;
        left: 0;
        opacity: 0;
        position: absolute;
        top: 0;
        z-index: 1;
        width: 100%;
      }

      .c35 {
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c17 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
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

      .c13 {
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

      .c12 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c18 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 24px;
      }

      .c19 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c34 {
        grid-column: span 12;
        max-width: 100%;
      }

      .c51 {
        grid-column: span 6;
        max-width: 100%;
      }

      @media (max-width:68.75rem) {
        .c19 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c19 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c34 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c34 {
          grid-column: span 12;
        }
      }

      @media (max-width:68.75rem) {
        .c51 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c51 {
          grid-column: span 12;
        }
      }

      <main
        aria-busy="false"
        aria-labelledby="main-content-title"
        class="c0"
        id="main-content"
        tabindex="-1"
      >
        <form
          action="#"
          novalidate=""
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
                    Advanced Settings
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c5 c6"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class="c7 c8 c9"
                  >
                    <svg
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
                  <span
                    class="c10 c11"
                  >
                    Save
                  </span>
                </button>
              </div>
              <p
                class="c12"
              />
            </div>
          </div>
          <div
            class="c13"
          >
            <div
              class="c14"
            >
              <div
                class="c15 c16"
                spacing="4"
              >
                <h2
                  class="c17"
                >
                  Settings
                </h2>
                <div
                  class="c18"
                >
                  <div
                    class="c19"
                  >
                    <div
                      class=""
                    >
                      <div>
                        <div
                          class="c20 c21"
                          spacing="1"
                        >
                          <span
                            class="c22"
                            for="select-1"
                            id="select-1-label"
                          >
                            <div
                              class="c23"
                            >
                              Default role for authenticated users
                            </div>
                          </span>
                          <div
                            class="c23 c24"
                          >
                            <button
                              aria-describedby="select-1-hint"
                              aria-disabled="false"
                              aria-expanded="false"
                              aria-haspopup="listbox"
                              aria-labelledby="select-1-label select-1-content"
                              class="c25"
                              id="select-1"
                              type="button"
                            />
                            <div
                              class="c26 c27"
                            >
                              <div
                                class="c23"
                              >
                                <div
                                  class="c28"
                                >
                                  <span
                                    class="c29"
                                    id="select-1-content"
                                  >
                                    Authenticated
                                  </span>
                                </div>
                              </div>
                              <div
                                class="c23"
                              >
                                <button
                                  aria-hidden="true"
                                  class="c30 c31 c32"
                                  tabindex="-1"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 14 8"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clip-rule="evenodd"
                                      d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
                                      fill="#32324D"
                                      fill-rule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <p
                            class="c33"
                            id="select-1-hint"
                          >
                            It will attach the new authenticated user to the selected role.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c34"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c35"
                      >
                        <div
                          class="c36 c37"
                          spacing="1"
                        >
                          <div
                            class="c38"
                          >
                            <label
                              class="c39"
                              for="toggleinput-1"
                            >
                              <div
                                class="c38"
                              >
                                One account per email address
                              </div>
                            </label>
                          </div>
                          <label
                            class="c40"
                          >
                            <div
                              class="c41"
                            >
                              One account per email address
                            </div>
                            <div
                              class="c42 c43"
                              display="inline-flex"
                            >
                              <div
                                aria-hidden="true"
                                class="c44 c38 c45"
                              >
                                <span
                                  class="c46"
                                >
                                  False
                                </span>
                              </div>
                              <div
                                aria-hidden="true"
                                class="c44 c38 c47"
                              >
                                <span
                                  class="c48"
                                >
                                  True
                                </span>
                              </div>
                              <input
                                aria-disabled="false"
                                class="c49"
                                id="toggleinput-1"
                                name="unique_email"
                                type="checkbox"
                              />
                            </div>
                          </label>
                          <p
                            class="c50"
                            id="toggleinput-1-hint"
                          >
                            Disallow the user to create multiple accounts using the same email address with different authentication providers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c34"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c35"
                      >
                        <div
                          class="c36 c37"
                          spacing="1"
                        >
                          <div
                            class="c38"
                          >
                            <label
                              class="c39"
                              for="toggleinput-2"
                            >
                              <div
                                class="c38"
                              >
                                Enable sign-ups
                              </div>
                            </label>
                          </div>
                          <label
                            class="c40"
                          >
                            <div
                              class="c41"
                            >
                              Enable sign-ups
                            </div>
                            <div
                              class="c42 c43"
                              display="inline-flex"
                            >
                              <div
                                aria-hidden="true"
                                class="c44 c38 c45"
                              >
                                <span
                                  class="c46"
                                >
                                  False
                                </span>
                              </div>
                              <div
                                aria-hidden="true"
                                class="c44 c38 c47"
                              >
                                <span
                                  class="c48"
                                >
                                  True
                                </span>
                              </div>
                              <input
                                aria-disabled="false"
                                class="c49"
                                id="toggleinput-2"
                                name="allow_register"
                                type="checkbox"
                              />
                            </div>
                          </label>
                          <p
                            class="c50"
                            id="toggleinput-2-hint"
                          >
                            When disabled (OFF), the registration process is forbidden. No one can subscribe anymore no matter the used provider.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c51"
                  >
                    <div
                      class=""
                    >
                      <div>
                        <div>
                          <div
                            class="c52 c53"
                            spacing="1"
                          >
                            <label
                              class="c54"
                              for="email_reset_password"
                            >
                              <div
                                class="c55"
                              >
                                Reset password page
                              </div>
                            </label>
                            <div
                              class="c56 c57"
                            >
                              <input
                                aria-describedby="email_reset_password-hint"
                                aria-disabled="false"
                                aria-invalid="false"
                                class="c58"
                                id="email_reset_password"
                                name="email_reset_password"
                                placeholder="ex: https://youtfrontend.com/reset-password"
                                type="text"
                                value="https://cat-bounce.com/"
                              />
                            </div>
                            <p
                              class="c59"
                              id="email_reset_password-hint"
                            >
                              URL of your application's reset password page.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c34"
                  >
                    <div
                      class=""
                    >
                      <div
                        class="c35"
                      >
                        <div
                          class="c36 c37"
                          spacing="1"
                        >
                          <div
                            class="c38"
                          >
                            <label
                              class="c39"
                              for="toggleinput-3"
                            >
                              <div
                                class="c38"
                              >
                                Enable email confirmation
                              </div>
                            </label>
                          </div>
                          <label
                            class="c40"
                          >
                            <div
                              class="c41"
                            >
                              Enable email confirmation
                            </div>
                            <div
                              class="c42 c43"
                              display="inline-flex"
                            >
                              <div
                                aria-hidden="true"
                                class="c44 c38 c45"
                              >
                                <span
                                  class="c46"
                                >
                                  False
                                </span>
                              </div>
                              <div
                                aria-hidden="true"
                                class="c44 c38 c47"
                              >
                                <span
                                  class="c48"
                                >
                                  True
                                </span>
                              </div>
                              <input
                                aria-disabled="false"
                                class="c49"
                                id="toggleinput-3"
                                name="email_confirmation"
                                type="checkbox"
                              />
                            </div>
                          </label>
                          <p
                            class="c50"
                            id="toggleinput-3-hint"
                          >
                            When enabled (ON), new registered users receive a confirmation email.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c51"
                  >
                    <div
                      class=""
                    >
                      <div>
                        <div>
                          <div
                            class="c52 c53"
                            spacing="1"
                          >
                            <label
                              class="c54"
                              for="email_confirmation_redirection"
                            >
                              <div
                                class="c55"
                              >
                                Redirection url
                              </div>
                            </label>
                            <div
                              class="c56 c60"
                              disabled=""
                            >
                              <input
                                aria-describedby="email_confirmation_redirection-hint"
                                aria-disabled="true"
                                aria-invalid="false"
                                class="c61"
                                id="email_confirmation_redirection"
                                name="email_confirmation_redirection"
                                placeholder="ex: https://youtfrontend.com/email-confirmation"
                                type="text"
                                value=""
                              />
                            </div>
                            <p
                              class="c59"
                              id="email_confirmation_redirection-hint"
                            >
                              After you confirmed your email, choose where you will be redirected.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    `);
  });
});
