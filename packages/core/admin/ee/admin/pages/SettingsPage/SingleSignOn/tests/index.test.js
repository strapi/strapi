import React from 'react';
import { act } from 'react-dom/test-utils';
import { getByLabelText, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import userEvent from '@testing-library/user-event';

import { useRBAC } from '@strapi/helper-plugin';
import server from './server';
import { SingleSignOn } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useNotification: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <SingleSignOn />
    </IntlProvider>
  </ThemeProvider>
);

describe('Admin | ee | SettingsPage | SSO', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const {
      container: { firstChild },
    } = render(App);

    await waitFor(() =>
      expect(
        screen.getByText('Create new user on SSO login if no account exists')
      ).toBeInTheDocument()
    );

    expect(firstChild).toMatchInlineSnapshot(`
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

      .c14 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c11 {
        padding-right: 8px;
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

      .c12 {
        height: 100%;
      }

      .c9 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 10px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
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

      .c9 .c13 {
        color: #ffffff;
      }

      .c9[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true'] .c13 {
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

      .c9[aria-disabled='true']:active .c13 {
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

      .c3:focus-visible {
        outline: none;
      }

      .c17 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
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
      }

      .c19 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c19 > * + * {
        margin-top: 16px;
      }

      .c20 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c30 {
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

      .c32 {
        padding-right: 32px;
        padding-left: 32px;
        border-radius: 4px;
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
      }

      .c27 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c34 {
        font-weight: 600;
        color: #666687;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c36 {
        font-weight: 600;
        color: #4945ff;
        text-transform: uppercase;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c38 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c25 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c25 > * + * {
        margin-top: 4px;
      }

      .c29 {
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

      .c28 {
        position: relative;
        display: inline-block;
      }

      .c31 {
        height: 2.5rem;
        overflow: hidden;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c31:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c33 {
        background-color: transparent;
        border: 1px solid #f6f6f9;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
      }

      .c35 {
        background-color: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        z-index: 2;
      }

      .c37 {
        height: 100%;
        left: 0;
        opacity: 0;
        position: absolute;
        top: 0;
        z-index: 1;
        width: 100%;
      }

      .c23 {
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
      }

      .c44 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c44:focus {
        outline: none;
      }

      .c44[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c47 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c49 {
        padding-left: 12px;
      }

      .c39 {
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

      .c42 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c41 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c48 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c52 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c40 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c40 > * + * {
        margin-top: 4px;
      }

      .c43 {
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

      .c43:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c50 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c50 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c50 svg path {
        fill: #666687;
      }

      .c51 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c51 svg {
        width: 0.375rem;
      }

      .c46 {
        width: 100%;
      }

      .c21 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c22 {
        grid-column: span 6;
        max-width: 100%;
      }

      @media (max-width:68.75rem) {
        .c22 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c22 {
          grid-column: span;
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
            <form>
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
                        Single Sign-On
                      </h1>
                    </div>
                    <button
                      aria-disabled="true"
                      class="c8 c9"
                      data-testid="save-button"
                      disabled=""
                      type="submit"
                    >
                      <div
                        aria-hidden="true"
                        class="c10 c11 c12"
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
                        class="c13 c14"
                      >
                        Save
                      </span>
                    </button>
                  </div>
                  <p
                    class="c15"
                  >
                    Configure the settings for the Single Sign-On feature.
                  </p>
                </div>
              </div>
              <div
                class="c16"
              >
                <div
                  class="c17 c18 c19"
                  spacing="4"
                >
                  <h2
                    class="c20"
                  >
                    Settings
                  </h2>
                  <div
                    class="c21"
                  >
                    <div
                      class="c22"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c23"
                        >
                          <div
                            class="c24 c25"
                            spacing="1"
                          >
                            <div
                              class="c26"
                            >
                              <label
                                class="c27"
                                for="toggleinput-1"
                              >
                                <div
                                  class="c26"
                                >
                                  Auto-registration
                                </div>
                              </label>
                            </div>
                            <label
                              class="c28"
                            >
                              <div
                                class="c29"
                              >
                                Auto-registration
                              </div>
                              <div
                                class="c30 c31"
                                display="inline-flex"
                              >
                                <div
                                  aria-hidden="true"
                                  class="c32 c26 c33"
                                >
                                  <span
                                    class="c34"
                                  >
                                    Off
                                  </span>
                                </div>
                                <div
                                  aria-hidden="true"
                                  class="c32 c26 c35"
                                >
                                  <span
                                    class="c36"
                                  >
                                    On
                                  </span>
                                </div>
                                <input
                                  aria-disabled="false"
                                  aria-label="autoRegister"
                                  checked=""
                                  class="c37"
                                  data-testid="autoRegister"
                                  id="toggleinput-1"
                                  name="autoRegister"
                                  type="checkbox"
                                />
                              </div>
                            </label>
                            <p
                              class="c38"
                              id="toggleinput-1-hint"
                            >
                              Create new user on SSO login if no account exists
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c22"
                    >
                      <div
                        class=""
                      >
                        <div>
                          <div
                            class="c39 c40"
                            spacing="1"
                          >
                            <span
                              class="c41"
                              for="select-1"
                              id="select-1-label"
                            >
                              <div
                                class="c42"
                              >
                                Default role
                              </div>
                            </span>
                            <div
                              class="c42 c43"
                            >
                              <button
                                aria-describedby="select-1-hint"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-haspopup="listbox"
                                aria-labelledby="select-1-label select-1-content"
                                class="c44"
                                id="select-1"
                                name="defaultRole"
                                type="button"
                              />
                              <div
                                class="c45 c46"
                              >
                                <div
                                  class="c42"
                                >
                                  <div
                                    class="c47"
                                  >
                                    <span
                                      class="c48"
                                      id="select-1-content"
                                    >
                                      Editor
                                    </span>
                                  </div>
                                </div>
                                <div
                                  class="c42"
                                >
                                  <button
                                    aria-hidden="true"
                                    class="c49 c50 c51"
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
                              class="c52"
                              id="select-1-hint"
                            >
                              It will attach the new authenticated user to the selected role
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    `);
  });

  it('should disable the form when there is no change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { getByTestId } = render(App);

    await waitFor(() =>
      expect(
        screen.getByText('Create new user on SSO login if no account exists')
      ).toBeInTheDocument()
    );

    expect(getByTestId('save-button')).toHaveAttribute('aria-disabled');
  });

  it('should not disable the form when there is a change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { container } = render(App);
    let el;

    await act(async () => {
      await waitFor(() => {
        el = getByLabelText(container, 'autoRegister');
      });
    });

    userEvent.click(el);

    expect(screen.getByTestId('save-button')).not.toBeDisabled();
  });
});
