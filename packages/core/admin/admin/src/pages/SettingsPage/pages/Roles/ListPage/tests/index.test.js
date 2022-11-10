/**
 *
 * Tests for ListPage
 *
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import { useRolesList } from '../../../../../../hooks';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import ListPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useRBAC: jest.fn(() => ({
    isLoading: true,
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  useRolesList: jest.fn(),
}));

const makeApp = (history) => (
  <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
    <TrackingProvider>
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Router history={history}>
            <ListPage />
          </Router>
        </Theme>
      </ThemeToggleProvider>
    </TrackingProvider>
  </IntlProvider>
);

describe('<ListPage />', () => {
  it('renders and matches the snapshot', () => {
    useRolesList.mockImplementationOnce(() => ({
      roles: [],
      isLoading: true,
      getData: jest.fn(),
    }));

    const history = createMemoryHistory();
    const App = makeApp(history);

    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c24 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
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
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c17 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c28 {
        background: #eaeaef;
      }

      .c30 {
        background: #f0f0ff;
        padding: 20px;
      }

      .c32 {
        background: #d9d8ff;
      }

      .c34 {
        padding-left: 12px;
      }

      .c15 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c19 {
        width: 100%;
        white-space: nowrap;
      }

      .c16 {
        position: relative;
      }

      .c16:before {
        background: linear-gradient(90deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c16:after {
        background: linear-gradient(270deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c18 {
        overflow-x: auto;
      }

      .c27 tr:last-of-type {
        border-bottom: none;
      }

      .c20 {
        border-bottom: 1px solid #eaeaef;
      }

      .c21 {
        border-bottom: 1px solid #eaeaef;
      }

      .c21 td,
      .c21 th {
        padding: 16px;
      }

      .c21 td:first-of-type,
      .c21 th:first-of-type {
        padding: 0 4px;
      }

      .c21 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 3.5rem;
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

      .c22 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c22 input {
        vertical-align: sub;
      }

      .c25 svg {
        height: 0.25rem;
      }

      .c29 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c35 {
        font-weight: 600;
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c33 {
        height: 1.5rem;
        width: 1.5rem;
        border-radius: 50%;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c33 svg {
        height: 0.625rem;
        width: 0.625rem;
      }

      .c33 svg path {
        fill: #4945ff;
      }

      .c31 {
        border-radius: 0 0 4px 4px;
        display: block;
        width: 100%;
        border: none;
      }

      .c26 {
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

      <main
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
                  roles
                </h1>
              </div>
              <button
                aria-disabled="false"
                class="c5 c6"
                type="button"
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
                      d="M24 13.604a.3.3 0 01-.3.3h-9.795V23.7a.3.3 0 01-.3.3h-3.21a.3.3 0 01-.3-.3v-9.795H.3a.3.3 0 01-.3-.3v-3.21a.3.3 0 01.3-.3h9.795V.3a.3.3 0 01.3-.3h3.21a.3.3 0 01.3.3v9.795H23.7a.3.3 0 01.3.3v3.21z"
                      fill="#212134"
                    />
                  </svg>
                </div>
                <span
                  class="c10 c11"
                >
                  Add new role
                </span>
              </button>
            </div>
            <p
              class="c12"
            >
              List of roles
            </p>
          </div>
        </div>
        <div
          class="c13"
        >
          <div
            class="c14 c15"
          >
            <div
              class="c16"
            >
              <div
                class="c17 c18"
              >
                <table
                  aria-colcount="5"
                  aria-rowcount="1"
                  class="c19"
                >
                  <thead
                    class="c20"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c21"
                    >
                      <th
                        aria-colindex="1"
                        class="c22"
                        tabindex="0"
                      >
                        <div
                          class="c23"
                        >
                          <span
                            class="c24"
                          >
                            Name
                          </span>
                          <span
                            class="c25"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c22"
                        tabindex="-1"
                      >
                        <div
                          class="c23"
                        >
                          <span
                            class="c24"
                          >
                            Description
                          </span>
                          <span
                            class="c25"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c22"
                        tabindex="-1"
                      >
                        <div
                          class="c23"
                        >
                          <span
                            class="c24"
                          >
                            Users
                          </span>
                          <span
                            class="c25"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c22"
                        tabindex="-1"
                      >
                        <div
                          class="c23"
                        >
                          <div
                            class="c26"
                          >
                            Actions
                          </div>
                          <span
                            class="c25"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c27"
                  />
                </table>
              </div>
            </div>
            <div>
              <hr
                class="c28 c29"
              />
              <button
                class="c30 c31"
              >
                <div
                  class="c23"
                >
                  <div
                    aria-hidden="true"
                    class="c32 c33"
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
                    class="c34"
                  >
                    <span
                      class="c35"
                    >
                      Add new role
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    `);
  });

  it('should show a list of roles', () => {
    useRolesList.mockImplementationOnce(() => ({
      roles: [
        {
          code: 'strapi-super-admin',
          created_at: '2021-08-24T14:37:20.384Z',
          description: 'Super Admins can access and manage all features and settings.',
          id: 1,
          name: 'Super Admin',
          updatedAt: '2021-08-24T14:37:20.384Z',
          usersCount: 1,
        },
      ],
      isLoading: false,
      getData: jest.fn(),
    }));

    useRBAC.mockImplementationOnce(() => ({
      isLoading: false,
      allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
    }));
    const history = createMemoryHistory();
    const App = makeApp(history);

    render(App);

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });
});
