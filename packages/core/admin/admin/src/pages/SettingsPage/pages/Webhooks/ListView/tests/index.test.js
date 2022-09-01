import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { useRBAC } from '@strapi/helper-plugin';
import ListView from '../index';
import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const history = createMemoryHistory();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Router history={history}>
        <ListView />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('Admin | containers | ListView', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canRead: true, canDelete: true },
    }));

    const {
      container: { firstChild },
    } = render(App);

    await waitFor(() => {
      expect(screen.getByText('http:://strapi.io')).toBeInTheDocument();
    });

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

      .c8 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3:focus-visible {
        outline: none;
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-busy="false"
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
                      Webhooks
                    </h1>
                  </div>
                  <a
                    aria-disabled="false"
                    class="sc-eQtFQz sc-imVSVl kvJsku iAjiLi"
                    href="//create"
                    variant="default"
                  >
                    <div
                      aria-hidden="true"
                      class="sc-dTWLky fHMtCA"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M24 13.604a.3.3 0 01-.3.3h-9.795V23.7a.3.3 0 01-.3.3h-3.21a.3.3 0 01-.3-.3v-9.795H.3a.3.3 0 01-.3-.3v-3.21a.3.3 0 01.3-.3h9.795V.3a.3.3 0 01.3-.3h3.21a.3.3 0 01.3.3v9.795H23.7a.3.3 0 01.3.3v3.21z"
                          fill="#212134"
                        />
                      </svg>
                    </div>
                    <span
                      class="sc-gcVIGZ EUHNl"
                    >
                      Create new webhook
                    </span>
                  </a>
                </div>
                <p
                  class="c8"
                >
                  Get POST changes notifications
                </p>
              </div>
            </div>
            <div
              class="c9"
            >
              <div
                class="sc-cCKzRf sc-cnTVOG iwaIho brQkTj"
              >
                <div
                  class="sc-cCKzRf sc-ePIFMk fxqLsZ knJEAS"
                >
                  <div
                    class="sc-cCKzRf sc-iNpzLj gntODS fZYzer"
                  >
                    <table
                      aria-colcount="5"
                      aria-rowcount="3"
                      class="sc-fezjOJ gqFWTe"
                    >
                      <thead
                        class="sc-eQxpLG enqhUA"
                      >
                        <tr
                          aria-rowindex="1"
                          class="sc-cCKzRf fxqLsZ sc-kOcGyv lhHDea"
                        >
                          <th
                            aria-colindex="1"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                          >
                            <div
                              class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                            >
                              <input
                                aria-label="Select all entries"
                                class="sc-iuqRDJ kjtlqd"
                                tabindex="0"
                                type="checkbox"
                              />
                              <span
                                class="sc-bXRjm lEmFC"
                              />
                            </div>
                          </th>
                          <th
                            aria-colindex="2"
                            class="sc-cCKzRf jiDpqC sc-cnHmbd hKyicT"
                            tabindex="-1"
                            width="20%"
                          >
                            <div
                              class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                            >
                              <span
                                class="sc-hKysef eyLOgx"
                              >
                                Name
                              </span>
                              <span
                                class="sc-bXRjm lEmFC"
                              />
                            </div>
                          </th>
                          <th
                            aria-colindex="3"
                            class="sc-cCKzRf kcIJgG sc-cnHmbd hKyicT"
                            tabindex="-1"
                            width="60%"
                          >
                            <div
                              class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                            >
                              <span
                                class="sc-hKysef eyLOgx"
                              >
                                URL
                              </span>
                              <span
                                class="sc-bXRjm lEmFC"
                              />
                            </div>
                          </th>
                          <th
                            aria-colindex="4"
                            class="sc-cCKzRf jiDpqC sc-cnHmbd hKyicT"
                            tabindex="-1"
                            width="20%"
                          >
                            <div
                              class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                            >
                              <span
                                class="sc-hKysef eyLOgx"
                              >
                                Status
                              </span>
                              <span
                                class="sc-bXRjm lEmFC"
                              />
                            </div>
                          </th>
                          <th
                            aria-colindex="5"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            tabindex="-1"
                          >
                            <div
                              class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                            >
                              <div
                                class="sc-dSaQTq ghklBO"
                              >
                                Actions
                              </div>
                              <span
                                class="sc-bXRjm lEmFC"
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        class="sc-iyyVIK kGrSwQ"
                      >
                        <tr
                          aria-rowindex="2"
                          class="sc-cCKzRf fxqLsZ sc-kOcGyv lhHDea"
                          style="cursor: pointer;"
                        >
                          <td
                            aria-colindex="1"
                            aria-hidden="true"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            role="button"
                          >
                            <input
                              aria-label="Select test"
                              class="sc-iuqRDJ kjtlqd"
                              id="select"
                              name="select"
                              tabindex="-1"
                              type="checkbox"
                            />
                          </td>
                          <td
                            aria-colindex="2"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            tabindex="-1"
                          >
                            <span
                              class="sc-hKysef iKdfrt"
                            >
                              test
                            </span>
                          </td>
                          <td
                            aria-colindex="3"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            tabindex="-1"
                          >
                            <span
                              class="sc-hKysef hBGYAA"
                            >
                              http:://strapi.io
                            </span>
                          </td>
                          <td
                            aria-colindex="4"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                          >
                            <div
                              aria-hidden="true"
                              class="kJTjod"
                              role="button"
                            >
                              <button
                                aria-checked="true"
                                aria-label="test Status"
                                class="sc-kGrBqp iqnjRp"
                                role="switch"
                                tabindex="-1"
                                type="button"
                              >
                                <div
                                  class="sc-gloWDX sc-gtPNqn iIanQj hWpYxN"
                                >
                                  <div
                                    class="sc-cBsmfy lebZZR"
                                  >
                                    <span>
                                      Enabled
                                    </span>
                                    <span>
                                      Disabled
                                    </span>
                                  </div>
                                  <span
                                    aria-hidden="true"
                                    class="sc-gloWDX civjUj"
                                  >
                                    Enabled
                                  </span>
                                </div>
                              </button>
                            </div>
                          </td>
                          <td
                            aria-colindex="5"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                          >
                            <div
                              aria-hidden="true"
                              class="sc-hrjYtz sc-hctura sc-jEieoE osjXL fbIYKi RxsGY"
                              role="button"
                              spacing="1"
                            >
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-1"
                                  class="sc-eZKLwX eukRtA sc-eqUgKp ifHOFn"
                                  tabindex="-1"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
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
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-3"
                                  class="sc-eZKLwX eukRtA sc-eqUgKp ifHOFn"
                                  id="delete-1"
                                  tabindex="-1"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 24 24"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M3.236 6.149a.2.2 0 00-.197.233L6 24h12l2.96-17.618a.2.2 0 00-.196-.233H3.236zM21.8 1.983c.11 0 .2.09.2.2v1.584a.2.2 0 01-.2.2H2.2a.2.2 0 01-.2-.2V2.183c0-.11.09-.2.2-.2h5.511c.9 0 1.631-1.09 1.631-1.983h5.316c0 .894.73 1.983 1.631 1.983H21.8z"
                                      fill="#32324D"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr
                          aria-rowindex="3"
                          class="sc-cCKzRf fxqLsZ sc-kOcGyv lhHDea"
                          style="cursor: pointer;"
                        >
                          <td
                            aria-colindex="1"
                            aria-hidden="true"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            role="button"
                          >
                            <input
                              aria-label="Select test2"
                              class="sc-iuqRDJ kjtlqd"
                              id="select"
                              name="select"
                              tabindex="-1"
                              type="checkbox"
                            />
                          </td>
                          <td
                            aria-colindex="2"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            tabindex="-1"
                          >
                            <span
                              class="sc-hKysef iKdfrt"
                            >
                              test2
                            </span>
                          </td>
                          <td
                            aria-colindex="3"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                            tabindex="-1"
                          >
                            <span
                              class="sc-hKysef hBGYAA"
                            >
                              http://me.io
                            </span>
                          </td>
                          <td
                            aria-colindex="4"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                          >
                            <div
                              aria-hidden="true"
                              class="kJTjod"
                              role="button"
                            >
                              <button
                                aria-checked="false"
                                aria-label="test2 Status"
                                class="sc-kGrBqp iqnjRp"
                                role="switch"
                                tabindex="-1"
                                type="button"
                              >
                                <div
                                  class="sc-gloWDX sc-gtPNqn iIanQj hWpYxN"
                                >
                                  <div
                                    class="sc-cBsmfy lebZZR"
                                  >
                                    <span>
                                      Enabled
                                    </span>
                                    <span>
                                      Disabled
                                    </span>
                                  </div>
                                  <span
                                    aria-hidden="true"
                                    class="sc-gloWDX gIxJdg"
                                  >
                                    Disabled
                                  </span>
                                </div>
                              </button>
                            </div>
                          </td>
                          <td
                            aria-colindex="5"
                            class="sc-cCKzRf fxqLsZ sc-cnHmbd hKyicT"
                          >
                            <div
                              aria-hidden="true"
                              class="sc-hrjYtz sc-hctura sc-jEieoE osjXL fbIYKi RxsGY"
                              role="button"
                              spacing="1"
                            >
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-5"
                                  class="sc-eZKLwX eukRtA sc-eqUgKp ifHOFn"
                                  tabindex="-1"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
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
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-7"
                                  class="sc-eZKLwX eukRtA sc-eqUgKp ifHOFn"
                                  id="delete-2"
                                  tabindex="-1"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 24 24"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M3.236 6.149a.2.2 0 00-.197.233L6 24h12l2.96-17.618a.2.2 0 00-.196-.233H3.236zM21.8 1.983c.11 0 .2.09.2.2v1.584a.2.2 0 01-.2.2H2.2a.2.2 0 01-.2-.2V2.183c0-.11.09-.2.2-.2h5.511c.9 0 1.631-1.09 1.631-1.983h5.316c0 .894.73 1.983 1.631 1.983H21.8z"
                                      fill="#32324D"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <hr
                    class="sc-cCKzRf sc-fZDhWb jAijyB jMWbJO"
                  />
                  <button
                    class="sc-cCKzRf sc-gmCRdq kFABus dnXyOd"
                  >
                    <div
                      class="sc-cCKzRf sc-hFxENk fxqLsZ hFYiXJ"
                    >
                      <div
                        aria-hidden="true"
                        class="sc-cCKzRf sc-iODwXF bsAaIb jEYepM"
                      >
                        <svg
                          fill="none"
                          height="1em"
                          viewBox="0 0 24 24"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M24 13.604a.3.3 0 01-.3.3h-9.795V23.7a.3.3 0 01-.3.3h-3.21a.3.3 0 01-.3-.3v-9.795H.3a.3.3 0 01-.3-.3v-3.21a.3.3 0 01.3-.3h9.795V.3a.3.3 0 01.3-.3h3.21a.3.3 0 01.3.3v9.795H23.7a.3.3 0 01.3.3v3.21z"
                            fill="#212134"
                          />
                        </svg>
                      </div>
                      <div
                        class="sc-cCKzRf hKkonI"
                      >
                        <span
                          class="sc-cQYgkQ kolKGl"
                        >
                          Create new webhook
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });

  describe('Shows a loading state', () => {
    it('should show a loader when it is loading for the permissions', () => {
      useRBAC.mockImplementation(() => ({
        isLoading: true,
        allowedActions: { canUpdate: true, canCreate: true, canRead: true, canDelete: true },
      }));

      render(App);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should show a loader when it is loading for the data and not for the permissions', () => {
      useRBAC.mockImplementation(() => ({
        isLoading: false,
        allowedActions: { canUpdate: true, canCreate: true, canRead: true, canDelete: true },
      }));

      render(App);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  it('should show a list of webhooks', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canRead: true, canDelete: true },
    }));

    render(App);

    await waitFor(() => {
      expect(screen.getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should show confirmation delete modal', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canCreate: true, canRead: true, canDelete: true },
    }));

    const { container, getByText } = render(App);
    await waitFor(() => {
      screen.getByText('http:://strapi.io');
    });

    fireEvent.click(container.querySelector('#delete-1'));

    expect(getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });
});
