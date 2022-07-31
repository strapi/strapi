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

      .c0:focus-visible {
        outline: none;
      }

      .c11 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
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
        padding: 8px 16px;
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

      .c14 {
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

      .c15 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c15 > * + * {
        margin-top: 32px;
      }

      .c17 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c17 > * + * {
        margin-top: 16px;
      }

      .c39 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c39 > * + * {
        margin-top: 24px;
      }

      .c40 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c40 > * + * {
        margin-top: 8px;
      }

      .c42 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c42 > * + * {
        margin-top: 4px;
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
      }

      .c24 {
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

      .c25 {
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

      .c23 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c27 {
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

      .c26 {
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

      .c26:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c22 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c22 > * + * {
        margin-top: 4px;
      }

      .c29 {
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

      .c31 {
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

      .c32 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c33 {
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

      .c33:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c34 {
        display: block;
        width: 100%;
        font-weight: 400;
        font-size: 0.875rem;
        border: none;
        color: #32324d;
        resize: none;
        background: inherit;
      }

      .c34::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c34::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c34:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c34::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c34:focus-within {
        outline: none;
      }

      .c30 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c30 > * + * {
        margin-top: 4px;
      }

      .c28 textarea {
        height: 5rem;
        line-height: 1.25rem;
      }

      .c28 textarea::-webkit-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c28 textarea::-moz-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c28 textarea:-ms-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c28 textarea::placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c18 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c41 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c35 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c38 {
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c64 {
        background: #eaeaef;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c19 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c36 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c20 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c37 {
        grid-column: span 7;
        max-width: 100%;
      }

      .c63 {
        grid-column: span 5;
        max-width: 100%;
      }

      .c56 {
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c57 {
        color: #4a4a6a;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c58 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c43 {
        border-radius: 4px;
      }

      .c46 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
        padding-left: 24px;
      }

      .c49 {
        max-width: 100%;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c52 {
        min-width: 0px;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c59 {
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

      .c61 {
        color: #666687;
        width: 0.6875rem;
      }

      .c47 {
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

      .c50 {
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

      .c60 {
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

      .c44 {
        border: 1px solid #f6f6f9;
      }

      .c44:hover:not([aria-disabled='true']) {
        border: 1px solid #4945ff;
      }

      .c44:hover:not([aria-disabled='true']) .sc-uWCef {
        color: #271fe0;
      }

      .c44:hover:not([aria-disabled='true']) .c55 {
        color: #4945ff;
      }

      .c44:hover:not([aria-disabled='true']) > .c45 {
        background: #f0f0ff;
      }

      .c44:hover:not([aria-disabled='true']) [data-strapi-dropdown='true'] {
        background: #d9d8ff;
      }

      .c53 {
        background: transparent;
        border: none;
        position: relative;
        outline: none;
      }

      .c53[aria-disabled='true'] {
        pointer-events: none;
      }

      .c53[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c53 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
      }

      .c53 svg path {
        fill: #4945ff;
      }

      .c53:after {
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

      .c53:focus-visible {
        outline: none;
      }

      .c53:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c51 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c51 > * + * {
        margin-left: 12px;
      }

      .c62 path {
        fill: #666687;
      }

      .c54 {
        text-align: left;
      }

      .c54 > span {
        max-width: 100%;
      }

      .c54 svg {
        width: 0.875rem;
        height: 0.875rem;
      }

      .c54 svg path {
        fill: #8e8ea9;
      }

      .c48 {
        min-height: 5.5rem;
        border-radius: 4px;
      }

      .c48:hover svg path {
        fill: #4945ff;
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
        .c37 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c37 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c63 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c63 {
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
                class="c2"
              >
                <div
                  class="c3"
                >
                  <h1
                    class="c4"
                  >
                    Create a role
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
              >
                Define the rights given to the role
              </p>
            </div>
          </div>
          <div
            class="c13"
          >
            <div
              class="c14 c15"
              spacing="7"
            >
              <div
                class="c16"
              >
                <div
                  class="c14 c17"
                  spacing="4"
                >
                  <h2
                    class="c18"
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
                          <div>
                            <div
                              class="c21 c22"
                              spacing="1"
                            >
                              <label
                                class="c23"
                                for="textinput-1"
                              >
                                <div
                                  class="c24"
                                >
                                  Name
                                </div>
                              </label>
                              <div
                                class="c25 c26"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c27"
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
                      class="c20"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c28"
                        >
                          <div>
                            <div
                              class="c29 c30"
                              spacing="1"
                            >
                              <div
                                class="c31"
                              >
                                <label
                                  class="c32"
                                  for="textarea-1"
                                >
                                  <div
                                    class="c31"
                                  >
                                    Description
                                  </div>
                                </label>
                              </div>
                              <div
                                class="c33"
                              >
                                <textarea
                                  aria-invalid="false"
                                  class="c34"
                                  id="textarea-1"
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
                class="c35 c36"
              >
                <div
                  class="c37"
                >
                  <div
                    class="c38"
                  >
                    <div
                      class="c14 c39"
                      spacing="6"
                    >
                      <div
                        class="c14 c40"
                        spacing="2"
                      >
                        <h2
                          class="c18"
                        >
                          Permissions
                        </h2>
                        <p
                          class="c41"
                        >
                          Only actions bound by a route are listed below.
                        </p>
                      </div>
                      <div
                        class="c14 c42"
                        spacing="1"
                      >
                        <div
                          aria-disabled="false"
                          class="c43 c44"
                          data-strapi-expanded="false"
                        >
                          <div
                            class="c45 c46 c47 c48"
                            cursor=""
                          >
                            <div
                              class="c45 c49 c50 c51"
                              spacing="3"
                            >
                              <button
                                aria-controls="accordion-content-accordion-1"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-labelledby="accordion-label-accordion-1"
                                class="c45 c52 c50 c53 c54"
                                data-strapi-accordion-toggle="true"
                                type="button"
                              >
                                <span
                                  class="c55 c56"
                                >
                                  <span
                                    class="c55 sc-uWCef c57"
                                    id="accordion-label-accordion-1"
                                  >
                                    Address
                                  </span>
                                  <p
                                    class="c55 c58"
                                    id="accordion-desc-accordion-1"
                                  >
                                    Define all allowed actions for the api::address plugin.
                                  </p>
                                </span>
                              </button>
                              <div
                                class="c45 c50 c51"
                                spacing="3"
                              >
                                <span
                                  aria-hidden="true"
                                  class="c45 c59 c60"
                                  cursor="pointer"
                                  data-strapi-dropdown="true"
                                  height="2rem"
                                  width="2rem"
                                >
                                  <svg
                                    class="c61 c62"
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
                  class="c63"
                >
                  <div
                    class="c64"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c14 c40"
                      spacing="2"
                    >
                      <h3
                        class="c18"
                      >
                        Advanced settings
                      </h3>
                      <p
                        class="c41"
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
