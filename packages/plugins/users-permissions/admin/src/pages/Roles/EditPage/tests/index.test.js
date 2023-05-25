import React from 'react';
import { fireEvent, render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router, Switch, Route } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import pluginId from '../../../../pluginId';
import RolesEditPage from '..';
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
            <Route path={`/settings/${pluginId}/roles/:id`} component={RolesEditPage} />
          </Switch>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
  const renderResult = render(app);
  history.push(`/settings/${pluginId}/roles/1`);

  return renderResult;
}

describe('Admin | containers | RoleEditPage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders users-permissions edit role and matches snapshot', async () => {
    const { container, getByTestId, getByRole } = makeAndRenderApp();
    await waitForElementToBeRemoved(() => getByTestId('loader'));
    await waitFor(() => expect(getByRole('heading', { name: /permissions/i })).toBeInTheDocument());

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c1 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c2 {
        padding-bottom: 8px;
      }

      .c7 {
        min-width: 0;
      }

      .c11 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c17 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c19 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c29 {
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
      }

      .c31 {
        font-size: 0.875rem;
        background: #ffffff;
        color: #32324d;
        padding: 16px;
        border-radius: 4px;
        width: 100%;
        height: 6.5625rem;
        line-height: 4;
      }

      .c33 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c36 {
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c40 {
        border-radius: 4px;
      }

      .c42 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
        padding-left: 24px;
      }

      .c44 {
        max-width: 100%;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c46 {
        background: transparent;
        min-width: 0;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c51 {
        background: #dcdce4;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        cursor: pointer;
      }

      .c53 {
        color: #666687;
        width: 0.6875rem;
      }

      .c56 {
        background: #eaeaef;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c10 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c15 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 0;
        color: #ffffff;
      }

      .c16 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c21 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c25 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c39 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c49 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c50 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #4a4a6a;
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c8 {
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

      .c12 {
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

      .c18 {
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
        gap: 16px;
      }

      .c24 {
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

      .c37 {
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

      .c38 {
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

      .c45 {
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

      .c52 {
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

      .c41 {
        border: 1px solid #f6f6f9;
      }

      .c41:hover:not([aria-disabled='true']) {
        border: 1px solid #4945ff;
      }

      .c41:hover:not([aria-disabled='true']) .c9 {
        color: #4945ff;
      }

      .c41:hover:not([aria-disabled='true']) > .c5 {
        background: #f0f0ff;
      }

      .c41:hover:not([aria-disabled='true']) [data-strapi-dropdown='true'] {
        background: #d9d8ff;
      }

      .c47 {
        border: none;
        position: relative;
        outline: none;
      }

      .c47[aria-disabled='true'] {
        pointer-events: none;
      }

      .c47[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c47 svg path {
        fill: #4945ff;
      }

      .c47:after {
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

      .c47:focus-visible {
        outline: none;
      }

      .c47:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c54 path {
        fill: #666687;
      }

      .c48 {
        text-align: left;
      }

      .c48 > span {
        max-width: 100%;
      }

      .c48 svg {
        width: 0.875rem;
        height: 0.875rem;
      }

      .c48 svg path {
        fill: #8e8ea9;
      }

      .c43 {
        min-height: 5.5rem;
        border-radius: 4px;
      }

      .c43:hover svg path {
        fill: #4945ff;
      }

      .c13 {
        position: relative;
        outline: none;
      }

      .c13 > svg {
        height: 12px;
        width: 12px;
      }

      .c13 > svg > g,
      .c13 > svg path {
        fill: #ffffff;
      }

      .c13[aria-disabled='true'] {
        pointer-events: none;
      }

      .c13:after {
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

      .c13:focus-visible {
        outline: none;
      }

      .c13:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c14 {
        height: 2rem;
      }

      .c14[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true'] .c9 {
        color: #666687;
      }

      .c14[aria-disabled='true'] svg > g,.c14[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c14[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true']:active .c9 {
        color: #666687;
      }

      .c14[aria-disabled='true']:active svg > g,.c14[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c14:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c14:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c14 svg > g,
      .c14 svg path {
        fill: #ffffff;
      }

      .c26 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c28 {
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

      .c27 {
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

      .c27:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c22 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c34 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
      }

      .c23 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c35 {
        grid-column: span 7;
        max-width: 100%;
      }

      .c55 {
        grid-column: span 5;
        max-width: 100%;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c30 {
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c30:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c32 {
        border: none;
        resize: none;
      }

      .c32::-webkit-input-placeholder {
        color: #8e8ea9;
        font-size: 0.875rem;
        color: #8e8ea9;
        opacity: 1;
      }

      .c32::-moz-placeholder {
        color: #8e8ea9;
        font-size: 0.875rem;
        color: #8e8ea9;
        opacity: 1;
      }

      .c32:-ms-input-placeholder {
        color: #8e8ea9;
        font-size: 0.875rem;
        color: #8e8ea9;
        opacity: 1;
      }

      .c32::placeholder {
        color: #8e8ea9;
        font-size: 0.875rem;
        color: #8e8ea9;
        opacity: 1;
      }

      .c32:focus-within {
        outline: none;
      }

      .c4 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c3 {
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-text-decoration: none;
        text-decoration: none;
        gap: 8px;
        position: relative;
        outline: none;
      }

      .c3 svg {
        font-size: 0.625rem;
      }

      .c3 svg path {
        fill: #4945ff;
      }

      .c3:hover {
        color: #7b79ff;
      }

      .c3:active {
        color: #271fe0;
      }

      .c3:after {
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

      .c3:focus-visible {
        outline: none;
      }

      .c3:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      @media (max-width:68.75rem) {
        .c23 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c23 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c35 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c35 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c55 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c55 {
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
                <a
                  aria-current="page"
                  class="c3 active"
                  href="/settings/users-permissions/roles"
                >
                  <svg
                    fill="none"
                    height="1rem"
                    viewBox="0 0 24 24"
                    width="1rem"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M24 13.3a.2.2 0 0 1-.2.2H5.74l8.239 8.239a.2.2 0 0 1 0 .282L12.14 23.86a.2.2 0 0 1-.282 0L.14 12.14a.2.2 0 0 1 0-.282L11.86.14a.2.2 0 0 1 .282 0L13.98 1.98a.2.2 0 0 1 0 .282L5.74 10.5H23.8c.11 0 .2.09.2.2v2.6Z"
                      fill="#212134"
                    />
                  </svg>
                  <span
                    class="c4"
                  >
                    Back
                  </span>
                </a>
              </div>
              <div
                class="c5 c6"
              >
                <div
                  class="c5 c7 c8"
                >
                  <h1
                    class="c9 c10"
                  >
                    Authenticated
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c5 c11 c12 c13 c14"
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
                    class="c9 c15"
                  >
                    Save
                  </span>
                </button>
              </div>
              <p
                class="c9 c16"
              >
                Default role given to authenticated user.
              </p>
            </div>
          </div>
          <div
            class="c17"
          >
            <div
              class="c5 c18"
            >
              <div
                class="c19"
              >
                <div
                  class="c5 c20"
                >
                  <h2
                    class="c9 c21"
                  >
                    Role details
                  </h2>
                  <div
                    class="c22"
                  >
                    <div
                      class="c23"
                    >
                      <div
                        class=""
                      >
                        <div>
                          <div
                            class=""
                          >
                            <div
                              class="c5 c24"
                            >
                              <label
                                class="c9 c25 c26"
                                for="1"
                              >
                                Name
                              </label>
                              <div
                                class="c5 c6 c27"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  aria-required="false"
                                  class="c28"
                                  id="1"
                                  name="name"
                                  value="Authenticated"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c23"
                    >
                      <div
                        class=""
                      >
                        <div
                          class=""
                        >
                          <div
                            class="c5 c24"
                          >
                            <label
                              class="c9 c25 c26"
                              for="description"
                            >
                              Description
                            </label>
                            <div
                              class="c29 c30"
                            >
                              <textarea
                                aria-invalid="false"
                                aria-required="false"
                                class="c31 c32"
                                font-size="2"
                                id="description"
                              >
                                Default role given to authenticated user.
                              </textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c33 c34"
              >
                <div
                  class="c35"
                >
                  <div
                    class="c36"
                  >
                    <div
                      class="c5 c37"
                    >
                      <div
                        class="c5 c38"
                      >
                        <h2
                          class="c9 c21"
                        >
                          Permissions
                        </h2>
                        <p
                          class="c9 c39"
                        >
                          Only actions bound by a route are listed below.
                        </p>
                      </div>
                      <div
                        class="c5 c24"
                      >
                        <div
                          aria-disabled="false"
                          class="c40 c41"
                          data-strapi-expanded="false"
                        >
                          <div
                            class="c5 c42 c6 c43"
                          >
                            <div
                              class="c5 c44 c45"
                            >
                              <button
                                aria-controls="accordion-content-2"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-labelledby="accordion-label-2"
                                class="c5 c46 c12 c47 c48"
                                data-strapi-accordion-toggle="true"
                                type="button"
                              >
                                <span
                                  class="c9 c49"
                                >
                                  <span
                                    class="c9 c50"
                                    id="accordion-label-2"
                                  >
                                    Address
                                  </span>
                                  <p
                                    class="c9 c39"
                                    id="accordion-desc-2"
                                  >
                                    Define all allowed actions for the api::address plugin.
                                  </p>
                                </span>
                              </button>
                              <div
                                class="c5 c45"
                              >
                                <span
                                  aria-hidden="true"
                                  class="c5 c51 c52"
                                  data-strapi-dropdown="true"
                                >
                                  <svg
                                    class="c53 c54"
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
                  class="c55"
                >
                  <div
                    class="c56"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c5 c38"
                    >
                      <h3
                        class="c9 c21"
                      >
                        Advanced settings
                      </h3>
                      <p
                        class="c9 c39"
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

  it("can edit a users-permissions role's name and description", async () => {
    const { getByLabelText, getByRole, getByTestId, getAllByText } = makeAndRenderApp();
    const user = userEvent.setup();

    // Check loading screen
    const loader = getByTestId('loader');
    expect(loader).toBeInTheDocument();

    // After loading, check other elements
    await waitForElementToBeRemoved(loader);
    const saveButton = getByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
    const nameField = getByLabelText(/name/i);
    expect(nameField).toBeInTheDocument();
    const descriptionField = getByLabelText(/description/i);
    expect(descriptionField).toBeInTheDocument();

    // Shows error when name is missing
    await user.clear(nameField);
    expect(nameField).toHaveValue('');
    await user.clear(descriptionField);
    expect(descriptionField).toHaveValue('');

    // Show errors after form submit
    await user.click(saveButton);
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    const errorMessages = await getAllByText(/invalid value/i);
    errorMessages.forEach((errorMessage) => expect(errorMessage).toBeInTheDocument());
  });

  it('can toggle the permissions accordions and actions', async () => {
    const user = userEvent.setup();
    // Create app and wait for loading
    const { getByLabelText, queryByText, getByTestId, getByText, getAllByRole } =
      makeAndRenderApp();
    const loader = getByTestId('loader');
    await waitForElementToBeRemoved(loader);

    // Open the collapse
    const collapse = getByText(/define all allowed actions for the api::address plugin/i);
    await user.click(collapse);
    expect(getByLabelText(/select all/i)).toBeInTheDocument();

    // Display the selected action's bound route
    const actionCogButton = getByTestId('action-cog');
    await user.click(actionCogButton);
    expect(getByText(/bound route to/i)).toBeInTheDocument();
    expect(getByText('POST')).toBeInTheDocument();
    expect(getByText('/addresses')).toBeInTheDocument();

    // Select all actions with the "select all" checkbox
    const [selectAllCheckbox, ...actionCheckboxes] = getAllByRole('checkbox');
    expect(selectAllCheckbox.checked).toBe(false);
    fireEvent.click(selectAllCheckbox);
    actionCheckboxes.forEach((actionCheckbox) => {
      expect(actionCheckbox.checked).toBe(true);
    });

    // Close the collapse
    await user.click(collapse);
    expect(queryByText(/select all/i)).not.toBeInTheDocument();
  });
});
