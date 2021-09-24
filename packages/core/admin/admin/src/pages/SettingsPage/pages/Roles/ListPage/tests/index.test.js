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
import { useRBAC } from '@strapi/helper-plugin';
import { useRolesList } from '../../../../../../hooks';

import Theme from '../../../../../../components/Theme';
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

const makeApp = history => (
  <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
    <Theme>
      <Router history={history}>
        <ListPage />
      </Router>
    </Theme>
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
      .c5 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c11 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c13 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c36 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4945ff;
      }

      .c14 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c12 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c25 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c2 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c8 {
        padding-right: 8px;
      }

      .c15 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c16 {
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c17 {
        background: #ffffff;
      }

      .c19 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c29 {
        background: #eaeaef;
      }

      .c31 {
        background: #f0f0ff;
        padding: 20px;
      }

      .c33 {
        background: #d9d8ff;
      }

      .c35 {
        padding-left: 12px;
      }

      .c3 {
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

      .c4 {
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

      .c6 {
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

      .c6 svg {
        height: 12px;
        width: 12px;
      }

      .c6 svg > g,
      .c6 svg path {
        fill: #ffffff;
      }

      .c6[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27 {
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

      .c9 {
        height: 100%;
      }

      .c7 {
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c7 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c7 .c10 {
        color: #ffffff;
      }

      .c7[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c7[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c7[aria-disabled='true'] svg > g,
      .c7[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c7[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c7[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c7[aria-disabled='true']:active svg > g,
      .c7[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c7:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c7:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c30 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c0 {
        outline: none;
      }

      .c21 {
        width: 100%;
        white-space: nowrap;
      }

      .c18 {
        position: relative;
        border-radius: 4px 4px 0 0;
      }

      .c18:before {
        background: linear-gradient(90deg,#000000 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c18:after {
        background: linear-gradient(270deg,#000000 0%,rgba(0,0,0,0) 100%);
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

      .c28 tr:last-of-type {
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

      .c34 {
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

      .c34 svg {
        height: 0.625rem;
        width: 0.625rem;
      }

      .c34 svg path {
        fill: #4945ff;
      }

      .c32 {
        border-radius: 0 0 4px 4px;
        display: block;
        width: 100%;
        border: none;
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
            class="c1 c2"
            data-strapi-header="true"
          >
            <div
              class="c1 c3"
            >
              <div
                class="c1 c4"
              >
                <h1
                  class="c5"
                  id="main-content-title"
                >
                  roles
                </h1>
              </div>
              <button
                aria-disabled="false"
                class="c6 c7"
                type="button"
              >
                <div
                  aria-hidden="true"
                  class="c1 c8 c9"
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
                  class="c10 c11 c12"
                >
                  Add new role
                </span>
              </button>
            </div>
            <p
              class="c10 c13 c14"
            >
              List of roles
            </p>
          </div>
        </div>
        <div
          class="c1 c15"
        >
          <div
            class="c1 c16"
          >
            <div
              class="c1 c17 c18"
            >
              <div
                class="c1 c19 c20"
              >
                <table
                  aria-colcount="5"
                  aria-rowcount="1"
                  class="c21"
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
                        tabindex="0"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span
                            class="c10 c11 c12 c25"
                          >
                            Name
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c24"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span
                            class="c10 c11 c12 c25"
                          >
                            Description
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c24"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span
                            class="c10 c11 c12 c25"
                          >
                            Users
                          </span>
                          <span
                            class="c26"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c24"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c4"
                        >
                          <div
                            class="c27"
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
                    class="c28"
                  />
                </table>
              </div>
            </div>
            <div>
              <hr
                class="c1 c29 c30"
              />
              <button
                class="c1 c31 c32"
              >
                <div
                  class="c1 c4"
                >
                  <div
                    aria-hidden="true"
                    class="c1 c33 c34"
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
                    class="c1 c35"
                  >
                    <span
                      class="c10 c36"
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
