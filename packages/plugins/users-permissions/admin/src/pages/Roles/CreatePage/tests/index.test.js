import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router, Switch, Route } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import pluginId from '../../../../pluginId';
import RolesCreatePage from '..';
import server from './server';

jest.mock('@strapi/helper-plugin', () => {
  // Make sure the references of the mock functions stay the same, otherwise we get an endless loop
  const mockToggleNotification = jest.fn();
  const mockUseNotification = jest.fn(() => {
    return mockToggleNotification;
  });

  return {
    ...jest.requireActual('@strapi/helper-plugin'),
    useNotification: mockUseNotification,
    useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  };
});

function makeAndRenderApp() {
  const history = createMemoryHistory();
  const app = (
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <Switch>
            <Route path={`/settings/${pluginId}/roles/new`} component={RolesCreatePage} />
          </Switch>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
  const renderResult = render(app);
  history.push(`/settings/${pluginId}/roles/new`);

  return renderResult;
}

describe('Admin | containers | RoleCreatePage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders users-permissions create role and matches snapshot', async () => {
    const { container, getByText, getByRole } = makeAndRenderApp();
    await waitFor(() =>
      expect(getByRole('heading', { name: /create a role/i })).toBeInTheDocument()
    );
    await waitFor(() => {
      expect(
        getByText(/define all allowed actions for the api::address plugin/i)
      ).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c4 {
        min-width: 0;
      }

      .c14 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c16 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c8 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c29 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c32 {
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c36 {
        border-radius: 4px;
      }

      .c38 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
        padding-left: 24px;
      }

      .c40 {
        max-width: 100%;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c42 {
        background: transparent;
        min-width: 0;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c47 {
        background: #dcdce4;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        cursor: pointer;
      }

      .c49 {
        color: #666687;
        width: 0.6875rem;
      }

      .c52 {
        background: #eaeaef;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c7 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c13 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c18 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c22 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c12 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c35 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c45 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c46 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #4a4a6a;
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
        gap: 32px;
      }

      .c17 {
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
        gap: 16px;
      }

      .c21 {
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
        gap: 4px;
      }

      .c9 {
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
        gap: 8px;
      }

      .c33 {
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
        gap: 24px;
      }

      .c34 {
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
        gap: 8px;
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
        gap: 12px;
      }

      .c48 {
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
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c37 {
        border: 1px solid #f6f6f9;
      }

      .c37:hover:not([aria-disabled='true']) {
        border: 1px solid #4945ff;
      }

      .c37:hover:not([aria-disabled='true']) .c6 {
        color: #4945ff;
      }

      .c37:hover:not([aria-disabled='true']) > .c2 {
        background: #f0f0ff;
      }

      .c37:hover:not([aria-disabled='true']) [data-strapi-dropdown='true'] {
        background: #d9d8ff;
      }

      .c43 {
        border: none;
        position: relative;
        outline: none;
      }

      .c43[aria-disabled='true'] {
        pointer-events: none;
      }

      .c43[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c43 svg path {
        fill: #4945ff;
      }

      .c43:after {
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

      .c43:focus-visible {
        outline: none;
      }

      .c43:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c50 path {
        fill: #666687;
      }

      .c44 {
        text-align: left;
      }

      .c44 > span {
        max-width: 100%;
      }

      .c44 svg {
        width: 0.875rem;
        height: 0.875rem;
      }

      .c44 svg path {
        fill: #8e8ea9;
      }

      .c39 {
        min-height: 5.5rem;
        border-radius: 4px;
      }

      .c39:hover svg path {
        fill: #4945ff;
      }

      .c10 {
        position: relative;
        outline: none;
      }

      .c10 > svg {
        height: 12px;
        width: 12px;
      }

      .c10 > svg > g,
      .c10 > svg path {
        fill: #ffffff;
      }

      .c10[aria-disabled='true'] {
        pointer-events: none;
      }

      .c10:after {
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

      .c10:focus-visible {
        outline: none;
      }

      .c10:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c11 {
        height: 2rem;
      }

      .c11[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c11[aria-disabled='true'] .c6 {
        color: #666687;
      }

      .c11[aria-disabled='true'] svg > g,.c11[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c11[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c11[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c11[aria-disabled='true']:active svg > g,.c11[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c11:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c11:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c11 svg > g,
      .c11 svg path {
        fill: #ffffff;
      }

      .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c25 {
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

      .c25::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c25::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c25:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c25::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c25[aria-disabled='true'] {
        color: inherit;
      }

      .c25:focus {
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
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c30 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
      }

      .c20 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c31 {
        grid-column: span 7;
        max-width: 100%;
      }

      .c51 {
        grid-column: span 5;
        max-width: 100%;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c27 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 12px;
        padding-bottom: 12px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c27:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c28 {
        display: block;
        width: 100%;
        font-weight: 400;
        font-size: 0.875rem;
        border: none;
        color: #32324d;
        resize: none;
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

      .c28:focus-within {
        outline: none;
      }

      .c26 textarea {
        height: 5rem;
        line-height: 1.25rem;
      }

      .c26 textarea::-webkit-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c26 textarea::-moz-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c26 textarea:-ms-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c26 textarea::placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      @media (max-width:68.75rem) {
        .c20 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c20 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c31 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c31 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c51 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c51 {
          grid-column: span;
        }
      }

      <main
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
                class="c2 c3"
              >
                <div
                  class="c2 c4 c5"
                >
                  <h1
                    class="c6 c7"
                  >
                    Create a role
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c2 c8 c9 c10 c11"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class=""
                  >
                    <svg
                      fill="none"
                      height="1rem"
                      viewBox="0 0 24 24"
                      width="1rem"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20.727 2.97a.2.2 0 0 1 .286 0l2.85 2.89a.2.2 0 0 1 0 .28L9.554 20.854a.2.2 0 0 1-.285 0l-9.13-9.243a.2.2 0 0 1 0-.281l2.85-2.892a.2.2 0 0 1 .284 0l6.14 6.209L20.726 2.97Z"
                        fill="#212134"
                      />
                    </svg>
                  </div>
                  <span
                    class="c6 c12"
                  >
                    Save
                  </span>
                </button>
              </div>
              <p
                class="c6 c13"
              >
                Define the rights given to the role
              </p>
            </div>
          </div>
          <div
            class="c14"
          >
            <div
              class="c2 c15"
            >
              <div
                class="c16"
              >
                <div
                  class="c2 c17"
                >
                  <h2
                    class="c6 c18"
                  >
                    Role details
                  </h2>
                  <div
                    class="c19"
                  >
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div>
                          <div
                            class=""
                          >
                            <div
                              class="c2 c21"
                            >
                              <label
                                class="c6 c22 c23"
                                for="1"
                              >
                                Name
                              </label>
                              <div
                                class="c2 c3 c24"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  aria-required="false"
                                  class="c25"
                                  id="1"
                                  name="name"
                                  value=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c26"
                        >
                          <div
                            class=""
                          >
                            <div
                              class="c2 c21"
                            >
                              <div
                                class="c2 c5"
                              >
                                <label
                                  class="c6 c22 c23"
                                  for="3"
                                >
                                  Description
                                </label>
                              </div>
                              <div
                                class="c27"
                              >
                                <textarea
                                  aria-invalid="false"
                                  aria-required="false"
                                  class="c28"
                                  id="3"
                                  name="description"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c29 c30"
              >
                <div
                  class="c31"
                >
                  <div
                    class="c32"
                  >
                    <div
                      class="c2 c33"
                    >
                      <div
                        class="c2 c34"
                      >
                        <h2
                          class="c6 c18"
                        >
                          Permissions
                        </h2>
                        <p
                          class="c6 c35"
                        >
                          Only actions bound by a route are listed below.
                        </p>
                      </div>
                      <div
                        class="c2 c21"
                      >
                        <div
                          aria-disabled="false"
                          class="c36 c37"
                          data-strapi-expanded="false"
                        >
                          <div
                            class="c2 c38 c3 c39"
                          >
                            <div
                              class="c2 c40 c41"
                            >
                              <button
                                aria-controls="accordion-content-4"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-labelledby="accordion-label-4"
                                class="c2 c42 c9 c43 c44"
                                data-strapi-accordion-toggle="true"
                                type="button"
                              >
                                <span
                                  class="c6 c45"
                                >
                                  <span
                                    class="c6 c46"
                                    id="accordion-label-4"
                                  >
                                    Address
                                  </span>
                                  <p
                                    class="c6 c35"
                                    id="accordion-desc-4"
                                  >
                                    Define all allowed actions for the api::address plugin.
                                  </p>
                                </span>
                              </button>
                              <div
                                class="c2 c41"
                              >
                                <span
                                  aria-hidden="true"
                                  class="c2 c47 c48"
                                  data-strapi-dropdown="true"
                                >
                                  <svg
                                    class="c49 c50"
                                    fill="none"
                                    height="1rem"
                                    viewBox="0 0 14 8"
                                    width="1rem"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clip-rule="evenodd"
                                      d="M14 .889a.86.86 0 0 1-.26.625L7.615 7.736A.834.834 0 0 1 7 8a.834.834 0 0 1-.615-.264L.26 1.514A.861.861 0 0 1 0 .889c0-.24.087-.45.26-.625A.834.834 0 0 1 .875 0h12.25c.237 0 .442.088.615.264a.86.86 0 0 1 .26.625Z"
                                      fill="#32324D"
                                      fill-rule="evenodd"
                                    />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c51"
                >
                  <div
                    class="c52"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c2 c34"
                    >
                      <h3
                        class="c6 c18"
                      >
                        Advanced settings
                      </h3>
                      <p
                        class="c6 c35"
                      >
                        Select the application's actions or the plugin's actions and click on the cog icon to display the bound route
                      </p>
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
