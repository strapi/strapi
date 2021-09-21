import React from 'react';
import { render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/parts';
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
      .c35 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c42 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #4a4a6a;
      }

      .c11 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c36 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c8 {
        padding-right: 8px;
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

      .c37 {
        border-radius: 4px;
      }

      .c39 {
        background: #f6f6f9;
        padding: 24px;
        border-radius: 4px;
      }

      .c41 {
        padding-right: 24px;
      }

      .c44 {
        background: #dcdce4;
      }

      .c47 {
        background: #eaeaef;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c45 {
        height: 2rem;
        width: 2rem;
        border-radius: 50%;
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
      }

      .c45 svg {
        height: 0.375rem;
        width: 0.6875rem;
      }

      .c45 svg path {
        fill: #666687;
      }

      .c38 {
        border: 1px solid transparent;
        overflow: hidden;
      }

      .c38:hover {
        border: 1px solid #4945ff;
      }

      .c38:hover .c34 {
        color: #271fe0;
      }

      .c38:hover .c10 {
        color: #4945ff;
      }

      .c38:hover > .c7 {
        background: #f0f0ff;
      }

      .c38:hover .c43 {
        background: #d9d8ff;
      }

      .c38:hover .c43 svg path {
        fill: #4945ff;
      }

      .c23 {
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

      .c24 {
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

      .c40 {
        border: none;
        background: transparent;
        display: block;
        width: 100%;
        text-align: unset;
        padding: 0;
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

      .c9 {
        height: 100%;
      }

      .c6 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
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

      .c15 {
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

      .c17 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c17 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c17 > * + * {
        margin-top: 16px;
      }

      .c22 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c22 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c22 > * + * {
        margin-top: 4px;
      }

      .c33 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c33 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c33 > * + * {
        margin-top: 8px;
      }

      .c26 {
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        height: 2.5rem;
      }

      .c26::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c26[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c25 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
      }

      .c21 textarea {
        height: 5rem;
      }

      .c19 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c30 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c20 {
        grid-column: span 6;
        word-break: break-all;
      }

      .c31 {
        grid-column: span 7;
        word-break: break-all;
      }

      .c46 {
        grid-column: span 5;
        word-break: break-all;
      }

      .c0 {
        outline: none;
      }

      .c28 {
        display: block;
        width: 100%;
        border: 1px solid #dcdce4;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 12px;
        padding-bottom: 12px;
        font-weight: 400;
        font-size: 0.875rem;
        color: #32324d;
        background: #ffffff;
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

      .c27 textarea {
        height: 5rem;
        line-height: 1.25rem;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans', 'Helvetica Neue',sans-serif;
      }

      .c27 textarea::-webkit-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c27 textarea::-moz-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c27 textarea:-ms-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c27 textarea::placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c14 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c2 {
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

      .c3 {
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

      .c4 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c12 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c13 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c18 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
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
        .c46 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c46 {
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
            class=""
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
                    id="main-content-title"
                  >
                    Authenticated
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
                class="c12 c13"
              >
                Default role given to authenticated user.
              </p>
            </div>
          </div>
          <div
            class="c14"
          >
            <div
              class="c7 c15"
            >
              <div
                class="c7 c16"
              >
                <div
                  class="c7 c17"
                >
                  <h2
                    class="c18"
                  >
                    Role details
                  </h2>
                  <div
                    class="c7 c19"
                  >
                    <div
                      class="c20"
                    >
                      <div
                        class="c7 "
                      >
                        <div
                          class="c21"
                        >
                          <div>
                            <div
                              class="c7 c22"
                            >
                              <div
                                class="c7 c23"
                              >
                                <label
                                  class="c10 c11"
                                  for="textinput-1"
                                >
                                  Name
                                </label>
                              </div>
                              <div
                                class="c7 c24 c25"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c26"
                                  id="textinput-1"
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
                      class="c20"
                    >
                      <div
                        class="c7 "
                      >
                        <div
                          class="c27"
                        >
                          <div>
                            <div
                              class="c7 c22"
                            >
                              <div
                                class="c7 c23"
                              >
                                <label
                                  class="c10 c11"
                                  for="textarea-2"
                                >
                                  Description
                                </label>
                              </div>
                              <textarea
                                aria-invalid="false"
                                class="c28"
                                id="textarea-2"
                                name="description"
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
                class="c7 c29 c30"
              >
                <div
                  class="c31"
                >
                  <div
                    class="c7 c32"
                  >
                    <div
                      class="c7 c17"
                    >
                      <div
                        class="c7 c33"
                      >
                        <h2
                          class="c34 c35"
                        >
                          Permissions
                        </h2>
                        <p
                          class="c10 c36"
                        >
                          Only actions bound by a route are listed below.
                        </p>
                      </div>
                      <div
                        class="c7 c37 c38"
                      >
                        <div
                          class="c7 c39"
                        >
                          <button
                            aria-controls="accordion-content-accordion-3"
                            aria-expanded="false"
                            aria-labelledby="accordion-label-accordion-3"
                            class="c40"
                            data-strapi-accordion-toggle="true"
                            type="button"
                          >
                            <div
                              class="c7 c24"
                            >
                              <div
                                class="c7 c41"
                              >
                                <span
                                  class="c34 c42"
                                  id="accordion-label-accordion-3"
                                >
                                  Address
                                </span>
                                <p
                                  class="c10 c36"
                                  id="accordion-desc-accordion-3"
                                >
                                  Define all allowed actions for the api::address plugin.
                                </p>
                              </div>
                              <span
                                aria-hidden="true"
                                class="c7 c43 c44 c45"
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
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c46"
                >
                  <div
                    class="c7 c47"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c7 c33"
                    >
                      <h3
                        class="c34 c35"
                      >
                        Advanced settings
                      </h3>
                      <p
                        class="c10 c36"
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
    await userEvent.clear(nameField);
    expect(nameField).toHaveValue('');
    await userEvent.clear(descriptionField);
    expect(descriptionField).toHaveValue('');

    // Show errors after form submit
    await userEvent.click(saveButton);
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    const errorMessages = await getAllByText(/invalid value/i);
    errorMessages.forEach(errorMessage => expect(errorMessage).toBeInTheDocument());
  });

  it('can toggle the permissions accordions', async () => {
    // Create app and wait for loading
    const { getByLabelText, queryByText, getByTestId, getByText } = makeAndRenderApp();
    const loader = getByTestId('loader');
    await waitForElementToBeRemoved(loader);

    // Open then close the collapse
    const collapse = getByText(/define all allowed actions for the api::address plugin/i);
    await userEvent.click(collapse);
    expect(getByLabelText(/select all/i)).toBeInTheDocument();
    await userEvent.click(collapse);
    expect(queryByText(/select all/i)).not.toBeInTheDocument();
  });
});
