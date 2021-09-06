import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';

import RoleListPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useNotification: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <RoleListPage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Admin | containers | RoleListPage', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c8 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c13 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c14 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c15 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c2 {
        padding-bottom: 56px;
      }

      .c5 {
        background: #f6f6f9;
        padding-top: 56px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c11 {
        padding-right: 8px;
      }

      .c6 {
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

      .c7 {
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

      .c9 {
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

      .c9 svg {
        height: 12px;
        width: 12px;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #ffffff;
      }

      .c9[aria-disabled='true'] {
        pointer-events: none;
      }

      .c10 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c10 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c10 .c12 {
        color: #ffffff;
      }

      .c10[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true'] .c12 {
        color: #666687;
      }

      .c10[aria-disabled='true'] svg > g,
      .c10[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c10[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true']:active .c12 {
        color: #666687;
      }

      .c10[aria-disabled='true']:active svg > g,
      .c10[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c10:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c10:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c1 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c3 {
        overflow-x: hidden;
      }

      .c4 {
        outline: none;
      }

      <div
        class="c0 c1"
      >
        <div
          class="c0 c2 c3"
        >
          <main
            aria-labelledby="Roles"
            class="c4"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c0 "
              style="height: 0px;"
            >
              <div
                class="c0 c5"
                data-strapi-header="true"
              >
                <div
                  class="c0 c6"
                >
                  <div
                    class="c0 c7"
                  >
                    <h1
                      class="c8"
                      id="roles"
                    >
                      Roles
                    </h1>
                  </div>
                  <button
                    aria-disabled="false"
                    class="c9 c10"
                    type="button"
                  >
                    <div
                      aria-hidden="true"
                      class="c0 c11"
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
                      class="c12 c13"
                    >
                      Add new role
                    </span>
                  </button>
                </div>
                <p
                  class="c12 c14 c15"
                >
                  List of roles
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });
});
