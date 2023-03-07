import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import ListView from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(),
  useGuidedTour: jest.fn(() => ({
    startSection: jest.fn(),
  })),
  useQueryParams: jest.fn().mockReturnValue([
    {
      query: {
        sort: 'test:ASC',
      },
    },
  ]),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: 'My super token',
            description: 'This describe my super token',
            type: 'read-only',
            createdAt: '2021-11-15T00:00:00.000Z',
          },
        ],
      },
    }),
  }),
}));

jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01T08:00:00.000Z'));

// TO BE REMOVED: we have added this mock to prevent errors in the snapshots caused by the Unicode space character
// before AM/PM in the dates, after the introduction of node 18.13
jest.mock('react-intl', () => {
  const reactIntl = jest.requireActual('react-intl');
  const intl = reactIntl.createIntl({
    locale: 'en',
  });

  intl.formatDate = jest.fn(() => '11/15/2021');
  intl.formatTime = jest.fn(() => '12:00 AM');

  return {
    ...reactIntl,
    useIntl: () => intl,
  };
});

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const makeApp = (history) => {
  return (
    <QueryClientProvider client={client}>
      <TrackingProvider>
        <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
          <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
            <Theme>
              <Router history={history}>
                <Route path="/settings/transfer-tokens">
                  <ListView />
                </Route>
              </Router>
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </TrackingProvider>
    </QueryClientProvider>
  );
};

describe('ADMIN | Pages | TRANSFER TOKENS | ListPage', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should show a list of transfer tokens', async () => {
    useRBAC.mockImplementation(() => ({
      allowedActions: {
        canCreate: true,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    }));
    const history = createMemoryHistory();
    history.push('/settings/transfer-tokens');
    const app = makeApp(history);

    const { container, getByText } = render(app);

    await waitFor(() => {
      expect(getByText('My super token')).toBeInTheDocument();
      expect(getByText('This describe my super token')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c1 {
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

      .c15 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c17 {
        position: relative;
      }

      .c19 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c27 {
        padding: 8px;
        border-radius: 4px;
        border-width: 0;
        border-color: #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c34 {
        max-width: 15.625rem;
      }

      .c42 {
        padding-left: 4px;
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

      .c28 {
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
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
        -webkit-box-pack: end;
        -webkit-justify-content: end;
        -ms-flex-pack: end;
        justify-content: end;
      }

      .c5 {
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

      .c25 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
      }

      .c35 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 600;
        color: #32324d;
      }

      .c36 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c37 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c29 {
        position: relative;
        outline: none;
      }

      .c29 svg {
        height: 12px;
        width: 12px;
      }

      .c29 svg > g,
      .c29 svg path {
        fill: #ffffff;
      }

      .c29[aria-disabled='true'] {
        pointer-events: none;
      }

      .c29:after {
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

      .c29:focus-visible {
        outline: none;
      }

      .c29:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c31 {
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

      .c43[aria-disabled='true'] .c4 {
        color: #666687;
      }

      .c43[aria-disabled='true']:active .c4 {
        color: #666687;
      }

      .c43:active .c4 {
        color: #4945ff;
      }

      .c43 .c4 {
        color: #271fe0;
      }

      .c30 svg > g,
      .c30 svg path {
        fill: #8e8ea9;
      }

      .c30:hover svg > g,
      .c30:hover svg path {
        fill: #666687;
      }

      .c30:active svg > g,
      .c30:active svg path {
        fill: #a5a5ba;
      }

      .c30[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c16 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c21 {
        width: 100%;
        white-space: nowrap;
      }

      .c18:before {
        background: linear-gradient(90deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c18:after {
        background: linear-gradient(270deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c20 {
        overflow-x: auto;
      }

      .c33 tr:last-of-type {
        border-bottom: none;
      }

      .c22 {
        border-bottom: 1px solid #eaeaef;
      }

      .c23 {
        border-bottom: 1px solid #eaeaef;
      }

      .c23 td,
      .c23 th {
        padding: 16px;
      }

      .c23 td:first-of-type,
      .c23 th:first-of-type {
        padding: 0 4px;
      }

      .c23 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 3.5rem;
      }

      .c24 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c24 input {
        vertical-align: sub;
      }

      .c26 svg {
        height: 0.25rem;
      }

      .c32 {
        -webkit-transform: rotate(180deg);
        -ms-transform: rotate(180deg);
        transform: rotate(180deg);
      }

      .c6 {
        background: #4945ff;
        padding-top: 8px;
        padding-right: 16px;
        padding-bottom: 8px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c12 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c41 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c7 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        gap: 8px;
      }

      .c10 {
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

      .c8 {
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

      .c39 {
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
        position: relative;
        outline: none;
      }

      .c39 svg path {
        fill: #4945ff;
      }

      .c39 svg {
        font-size: 0.625rem;
      }

      .c39:after {
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

      .c39:focus-visible {
        outline: none;
      }

      .c39:focus-visible:after {
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
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c9[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true'] .c11 {
        color: #666687;
      }

      .c9[aria-disabled='true'] svg > g,.c9[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c9[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true']:active .c11 {
        color: #666687;
      }

      .c9[aria-disabled='true']:active svg > g,.c9[aria-disabled='true']:active svg path {
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

      .c40 svg path {
        fill: #8e8ea9;
      }

      .c40:hover svg path,
      .c40:focus svg path {
        fill: #32324d;
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
                  class="c4 c5"
                >
                  Transfer Tokens
                </h1>
              </div>
              <a
                aria-disabled="false"
                class="c6 c7 c8 c9"
                data-testid="create-transfer-token-button"
                href="/settings/transfer-tokens/create"
              >
                <div
                  aria-hidden="true"
                  class="c10"
                >
                  <svg
                    fill="none"
                    height="1rem"
                    viewBox="0 0 24 24"
                    width="1rem"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M24 13.604a.3.3 0 0 1-.3.3h-9.795V23.7a.3.3 0 0 1-.3.3h-3.21a.3.3 0 0 1-.3-.3v-9.795H.3a.3.3 0 0 1-.3-.3v-3.21a.3.3 0 0 1 .3-.3h9.795V.3a.3.3 0 0 1 .3-.3h3.21a.3.3 0 0 1 .3.3v9.795H23.7a.3.3 0 0 1 .3.3v3.21Z"
                      fill="#212134"
                    />
                  </svg>
                </div>
                <span
                  class="c11 c12"
                >
                  Create new Transfer Token
                </span>
              </a>
            </div>
            <p
              class="c4 c13"
            >
              "List of generated transfer tokens"
            </p>
          </div>
        </div>
        <div
          class="c14"
        >
          <div
            class="c15 c16"
          >
            <div
              class="c17 c18"
            >
              <div
                class="c19 c20"
              >
                <table
                  aria-colcount="5"
                  aria-rowcount="2"
                  class="c21"
                  role="grid"
                >
                  <thead
                    class="c22"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c23"
                    >
                      <th
                        aria-colindex="1"
                        class="c24"
                        role="gridcell"
                        tabindex="0"
                      >
                        <div
                          class="c3"
                        >
                          <span>
                            <span
                              aria-labelledby="0"
                              class="c4 c25"
                              label="Name"
                              tabindex="-1"
                            >
                              Name
                            </span>
                          </span>
                          <span
                            class="c26"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby="1"
                                class="c27 c28 c29 c30"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c31"
                                >
                                  Sort on Name
                                </span>
                                <svg
                                  aria-hidden="true"
                                  class="c32"
                                  fill="none"
                                  focusable="false"
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
                              </button>
                            </span>
                          </span>
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c24"
                        role="gridcell"
                      >
                        <div
                          class="c3"
                        >
                          <span>
                            <span
                              aria-labelledby="2"
                              class="c4 c25"
                              label="Description"
                              tabindex="-1"
                            >
                              Description
                            </span>
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c24"
                        role="gridcell"
                      >
                        <div
                          class="c3"
                        >
                          <span>
                            <span
                              aria-labelledby="3"
                              class="c4 c25"
                              label="Created at"
                              tabindex="-1"
                            >
                              Created at
                            </span>
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c24"
                        role="gridcell"
                      >
                        <div
                          class="c3"
                        >
                          <span>
                            <span
                              aria-labelledby="4"
                              class="c4 c25"
                              label="Last used"
                              tabindex="-1"
                            >
                              Last used
                            </span>
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="5"
                        class="c24"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c3"
                        >
                          <div
                            class="c31"
                          >
                            Actions
                          </div>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c33"
                    entriestodelete=""
                    headers="[object Object],[object Object],[object Object],[object Object]"
                  >
                    <tr
                      aria-rowindex="2"
                      class="c23"
                      style="cursor: pointer;"
                    >
                      <td
                        aria-colindex="1"
                        class="c34 c24"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c4 c35"
                        >
                          My super token
                        </span>
                      </td>
                      <td
                        aria-colindex="2"
                        class="c34 c24"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c4 c36"
                        >
                          This describe my super token
                        </span>
                      </td>
                      <td
                        aria-colindex="3"
                        class="c24"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c4 c37"
                        >
                          <time
                            datetime="2021-11-15T00:00:00.000Z"
                            title="11/15/2021 12:00 AM"
                          >
                            in 6 years
                          </time>
                        </span>
                      </td>
                      <td
                        aria-colindex="4"
                        class="c24"
                        role="gridcell"
                        tabindex="-1"
                      />
                      <td
                        aria-colindex="5"
                        class="c24"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c38"
                        >
                          <a
                            class="c39 c40"
                            href="/settings/transfer-tokens/1"
                            tabindex="-1"
                            title="Edit My super token"
                          >
                            <span
                              class="c11 c41"
                            >
                              <svg
                                fill="none"
                                height="1rem"
                                viewBox="0 0 24 24"
                                width="1rem"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 0 1 1.887 0l3.118 3.118ZM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0Z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </span>
                          </a>
                          <div
                            class="c42"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby="5"
                                class="c27 c28 c29 c30"
                                name="delete"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c31"
                                >
                                  Delete My super token
                                </span>
                                <svg
                                  aria-hidden="true"
                                  fill="none"
                                  focusable="false"
                                  height="1rem"
                                  viewBox="0 0 24 24"
                                  width="1rem"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M3.236 6.149a.2.2 0 0 0-.197.233L6 24h12l2.96-17.618a.2.2 0 0 0-.196-.233H3.236ZM21.8 1.983c.11 0 .2.09.2.2v1.584a.2.2 0 0 1-.2.2H2.2a.2.2 0 0 1-.2-.2V2.183c0-.11.09-.2.2-.2h5.511c.9 0 1.631-1.09 1.631-1.983h5.316c0 .894.73 1.983 1.631 1.983H21.8Z"
                                    fill="#32324D"
                                  />
                                </svg>
                              </button>
                            </span>
                          </div>
                        </div>
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

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockImplementation(() => ({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    }));

    const history = createMemoryHistory();
    const app = makeApp(history);

    const { queryByTestId } = render(app);

    await waitFor(() =>
      expect(queryByTestId('create-transfer-token-button')).not.toBeInTheDocument()
    );
  });

  it('should show the delete button when the user have the rights to delete', async () => {
    useRBAC.mockImplementation(() => ({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    }));
    const history = createMemoryHistory();
    history.push('/settings/transfer-tokens');
    const app = makeApp(history);

    const { container } = render(app);

    await waitFor(() => {
      expect(container.querySelector('button[name="delete"]')).toBeInTheDocument();
    });
  });

  it('should show the read button when the user have the rights to read and not to update', async () => {
    useRBAC.mockImplementation(() => ({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    }));
    const history = createMemoryHistory();
    history.push('/settings/transfer-tokens');
    const app = makeApp(history);

    const { container } = render(app);

    await waitFor(() => {
      expect(container.querySelector('a[title*="Read"]')).toBeInTheDocument();
    });
  });
});
