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
    useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
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
      .c2 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c14 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c17 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c10 {
        padding-right: 8px;
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
        min-width: 0px;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c47 {
        background: #dcdce4;
        border-radius: 50%;
        cursor: pointer;
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

      .c19 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c23 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c12 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
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

      .c20 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c30 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c21 {
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

      .c11 {
        height: 100%;
      }

      .c9 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
      }

      .c9 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c9 .c6 {
        color: #ffffff;
      }

      .c9[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true'] .c6 {
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

      .c9[aria-disabled='true']:active .c6 {
        color: #666687;
      }

      .c9[aria-disabled='true']:active svg > g,
      .c9[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c9:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c9:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #ffffff;
      }

      .c16 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c16 > * + * {
        margin-top: 32px;
      }

      .c18 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c18 > * + * {
        margin-top: 16px;
      }

      .c22 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c22 > * + * {
        margin-top: 4px;
      }

      .c33 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c33 > * + * {
        margin-top: 24px;
      }

      .c34 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c34 > * + * {
        margin-top: 8px;
      }

      .c41 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c41 > * + * {
        margin-left: 12px;
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

      .c50 path {
        fill: #666687;
      }

      .c43 {
        background: transparent;
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

      .c43 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
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

      .c37 {
        border: 1px solid #f6f6f9;
      }

      .c37:hover:not([aria-disabled='true']) {
        border: 1px solid #4945ff;
      }

      .c37:hover:not([aria-disabled='true']) .sc-cOLXoO {
        color: #271fe0;
      }

      .c37:hover:not([aria-disabled='true']) .c6 {
        color: #4945ff;
      }

      .c37:hover:not([aria-disabled='true']) > .c3 {
        background: #f0f0ff;
      }

      .c37:hover:not([aria-disabled='true']) [data-strapi-dropdown='true'] {
        background: #d9d8ff;
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

      @media (max-width:68.75rem) {
        .c21 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c21 {
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
              class="c1 c2"
              data-strapi-header="true"
            >
              <div
                class="c1 c3 c4"
              >
                <div
                  class="c1 c3 c5"
                >
                  <h1
                    class="c6 c7"
                  >
                    Create a role
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c8 c9"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class="c1 c10 c11"
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
            class="c1 c14"
          >
            <div
              class="c1 c3 c15 c16"
              spacing="7"
            >
              <div
                class="c1 c17"
              >
                <div
                  class="c1 c3 c15 c18"
                  spacing="4"
                >
                  <h2
                    class="c6 c19"
                  >
                    Role details
                  </h2>
                  <div
                    class="c1 c20"
                  >
                    <div
                      class="c21"
                    >
                      <div
                        class="c1 "
                      >
                        <div>
                          <div>
                            <div
                              class="c1 c3 c15 c22"
                              spacing="1"
                            >
                              <label
                                class="c6 c23"
                                for="textinput-1"
                              >
                                <div
                                  class="c1 c3 c5"
                                >
                                  Name
                                </div>
                              </label>
                              <div
                                class="c1 c3 c4 c24"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c25"
                                  id="textinput-1"
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
                      class="c21"
                    >
                      <div
                        class="c1 "
                      >
                        <div
                          class="c26"
                        >
                          <div>
                            <div
                              class="c1 c3 c15 c22"
                              spacing="1"
                            >
                              <div
                                class="c1 c3 c5"
                              >
                                <label
                                  class="c6 c23"
                                  for="textarea-2"
                                >
                                  <div
                                    class="c1 c3 c5"
                                  >
                                    Description
                                  </div>
                                </label>
                              </div>
                              <div
                                class="c27"
                              >
                                <textarea
                                  aria-invalid="false"
                                  class="c28"
                                  id="textarea-2"
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
                class="c1 c29 c30"
              >
                <div
                  class="c31"
                >
                  <div
                    class="c1 c32"
                  >
                    <div
                      class="c1 c3 c15 c33"
                      spacing="6"
                    >
                      <div
                        class="c1 c3 c15 c34"
                        spacing="2"
                      >
                        <h2
                          class="c6 c19"
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
                        class="c1 c3 c15 c22"
                        spacing="1"
                      >
                        <div
                          aria-disabled="false"
                          class="c1 c36 c37"
                          data-strapi-expanded="false"
                        >
                          <div
                            class="c1 c3 c38 c4 c39"
                            cursor=""
                          >
                            <div
                              class="c1 c3 c40 c5 c41"
                              spacing="3"
                            >
                              <button
                                aria-controls="accordion-content-accordion-7"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-labelledby="accordion-label-accordion-7"
                                class="c1 c3 c42 c5 c43 c44"
                                data-strapi-accordion-toggle="true"
                                type="button"
                              >
                                <span
                                  class="c6 c45"
                                >
                                  <span
                                    class="c6 sc-cOLXoO c46"
                                    id="accordion-label-accordion-7"
                                  >
                                    Address
                                  </span>
                                  <p
                                    class="c6 c35"
                                    id="accordion-desc-accordion-7"
                                  >
                                    Define all allowed actions for the api::address plugin.
                                  </p>
                                </span>
                              </button>
                              <div
                                class="c1 c3 c5 c41"
                                spacing="3"
                              >
                                <span
                                  aria-hidden="true"
                                  class="c1 c3 c47 c48"
                                  cursor="pointer"
                                  data-strapi-dropdown="true"
                                  height="2rem"
                                  width="2rem"
                                >
                                  <svg
                                    class="c1 c49 c50"
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 14 8"
                                    width="0.6875rem"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clip-rule="evenodd"
                                      d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
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
                    class="c1 c52"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c1 c3 c15 c34"
                      spacing="2"
                    >
                      <h3
                        class="c6 c19"
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
