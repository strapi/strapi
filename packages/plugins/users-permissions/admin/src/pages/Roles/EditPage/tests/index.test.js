import React from 'react';
import { render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
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
      .c21 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c16 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c13 {
        padding-right: 8px;
      }

      .c10 {
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

      .c10 svg {
        height: 12px;
        width: 12px;
      }

      .c10 svg > g,
      .c10 svg path {
        fill: #ffffff;
      }

      .c10[aria-disabled='true'] {
        pointer-events: none;
      }

      .c10:after {
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

      .c10:focus-visible {
        outline: none;
      }

      .c10:focus-visible:after {
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
        height: 100%;
      }

      .c11 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
      }

      .c11 .c12 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c11 .c15 {
        color: #ffffff;
      }

      .c11[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c11[aria-disabled='true'] .c15 {
        color: #666687;
      }

      .c11[aria-disabled='true'] svg > g,
      .c11[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c11[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c11[aria-disabled='true']:active .c15 {
        color: #666687;
      }

      .c11[aria-disabled='true']:active svg > g,
      .c11[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c11:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c11:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c11 svg > g,
      .c11 svg path {
        fill: #ffffff;
      }

      .c19 {
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

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 32px;
      }

      .c22 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c22 > * + * {
        margin-top: 16px;
      }

      .c44 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c44 > * + * {
        margin-top: 24px;
      }

      .c45 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c45 > * + * {
        margin-top: 8px;
      }

      .c47 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c47 > * + * {
        margin-top: 4px;
      }

      .c26 {
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

      .c29 {
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

      .c30 {
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

      .c28 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c32 {
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

      .c32::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c32::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c32:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c32::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c32[aria-disabled='true'] {
        color: inherit;
      }

      .c32:focus {
        outline: none;
        box-shadow: none;
      }

      .c31 {
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

      .c31:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c27 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c27 > * + * {
        margin-top: 4px;
      }

      .c34 {
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

      .c36 {
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

      .c37 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c38 {
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

      .c38:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c39 {
        display: block;
        width: 100%;
        font-weight: 400;
        font-size: 0.875rem;
        border: none;
        color: #32324d;
        resize: none;
        background: inherit;
      }

      .c39::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c39::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c39:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c39::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c39:focus-within {
        outline: none;
      }

      .c35 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c35 > * + * {
        margin-top: 4px;
      }

      .c33 textarea {
        height: 5rem;
        line-height: 1.25rem;
      }

      .c33 textarea::-webkit-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c33 textarea::-moz-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c33 textarea:-ms-input-placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c33 textarea::placeholder {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #8e8ea9;
        opacity: 1;
      }

      .c23 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c46 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c6 {
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c4 {
        padding-right: 8px;
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
        position: relative;
        outline: none;
      }

      .c3 svg path {
        fill: #4945ff;
      }

      .c3 svg {
        font-size: 0.625rem;
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

      .c5 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

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

      .c18 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c7 {
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

      .c9 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c17 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c40 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c43 {
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c69 {
        background: #eaeaef;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
      }

      .c24 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c41 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c25 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c42 {
        grid-column: span 7;
        max-width: 100%;
      }

      .c68 {
        grid-column: span 5;
        max-width: 100%;
      }

      .c61 {
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c62 {
        color: #4a4a6a;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c63 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c48 {
        border-radius: 4px;
      }

      .c51 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
        padding-left: 24px;
      }

      .c54 {
        max-width: 100%;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c57 {
        min-width: 0px;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c64 {
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

      .c66 {
        color: #666687;
        width: 0.6875rem;
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c55 {
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

      .c65 {
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

      .c49 {
        border: 1px solid #f6f6f9;
      }

      .c49:hover:not([aria-disabled='true']) {
        border: 1px solid #4945ff;
      }

      .c49:hover:not([aria-disabled='true']) .sc-uWCef {
        color: #271fe0;
      }

      .c49:hover:not([aria-disabled='true']) .c60 {
        color: #4945ff;
      }

      .c49:hover:not([aria-disabled='true']) > .c50 {
        background: #f0f0ff;
      }

      .c49:hover:not([aria-disabled='true']) [data-strapi-dropdown='true'] {
        background: #d9d8ff;
      }

      .c58 {
        background: transparent;
        border: none;
        position: relative;
        outline: none;
      }

      .c58[aria-disabled='true'] {
        pointer-events: none;
      }

      .c58[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c58 svg {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        font-size: 0.625rem;
      }

      .c58 svg path {
        fill: #4945ff;
      }

      .c58:after {
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

      .c58:focus-visible {
        outline: none;
      }

      .c58:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c56 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c56 > * + * {
        margin-left: 12px;
      }

      .c67 path {
        fill: #666687;
      }

      .c59 {
        text-align: left;
      }

      .c59 > span {
        max-width: 100%;
      }

      .c59 svg {
        width: 0.875rem;
        height: 0.875rem;
      }

      .c59 svg path {
        fill: #8e8ea9;
      }

      .c53 {
        min-height: 5.5rem;
        border-radius: 4px;
      }

      .c53:hover svg path {
        fill: #4945ff;
      }

      @media (max-width:68.75rem) {
        .c25 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c25 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c42 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c42 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c68 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c68 {
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
                  <span
                    aria-hidden="true"
                    class="c4 c5"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 24 24"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24 13.3a.2.2 0 01-.2.2H5.74l8.239 8.239a.2.2 0 010 .282L12.14 23.86a.2.2 0 01-.282 0L.14 12.14a.2.2 0 010-.282L11.86.14a.2.2 0 01.282 0L13.98 1.98a.2.2 0 010 .282L5.74 10.5H23.8c.11 0 .2.09.2.2v2.6z"
                        fill="#212134"
                      />
                    </svg>
                  </span>
                  <span
                    class="c6"
                  >
                    Back
                  </span>
                </a>
              </div>
              <div
                class="c7"
              >
                <div
                  class="c8"
                >
                  <h1
                    class="c9"
                  >
                    Authenticated
                  </h1>
                </div>
                <button
                  aria-disabled="false"
                  class="c10 c11"
                  type="submit"
                >
                  <div
                    aria-hidden="true"
                    class="c12 c13 c14"
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
                    class="c15 c16"
                  >
                    Save
                  </span>
                </button>
              </div>
              <p
                class="c17"
              >
                Default role given to authenticated user.
              </p>
            </div>
          </div>
          <div
            class="c18"
          >
            <div
              class="c19 c20"
              spacing="7"
            >
              <div
                class="c21"
              >
                <div
                  class="c19 c22"
                  spacing="4"
                >
                  <h2
                    class="c23"
                  >
                    Role details
                  </h2>
                  <div
                    class="c24"
                  >
                    <div
                      class="c25"
                    >
                      <div
                        class=""
                      >
                        <div>
                          <div>
                            <div
                              class="c26 c27"
                              spacing="1"
                            >
                              <label
                                class="c28"
                                for="textinput-1"
                              >
                                <div
                                  class="c29"
                                >
                                  Name
                                </div>
                              </label>
                              <div
                                class="c30 c31"
                              >
                                <input
                                  aria-disabled="false"
                                  aria-invalid="false"
                                  class="c32"
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
                      class="c25"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c33"
                        >
                          <div>
                            <div
                              class="c34 c35"
                              spacing="1"
                            >
                              <div
                                class="c36"
                              >
                                <label
                                  class="c37"
                                  for="textarea-1"
                                >
                                  <div
                                    class="c36"
                                  >
                                    Description
                                  </div>
                                </label>
                              </div>
                              <div
                                class="c38"
                              >
                                <textarea
                                  aria-invalid="false"
                                  class="c39"
                                  id="textarea-1"
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
              </div>
              <div
                class="c40 c41"
              >
                <div
                  class="c42"
                >
                  <div
                    class="c43"
                  >
                    <div
                      class="c19 c44"
                      spacing="6"
                    >
                      <div
                        class="c19 c45"
                        spacing="2"
                      >
                        <h2
                          class="c23"
                        >
                          Permissions
                        </h2>
                        <p
                          class="c46"
                        >
                          Only actions bound by a route are listed below.
                        </p>
                      </div>
                      <div
                        class="c19 c47"
                        spacing="1"
                      >
                        <div
                          aria-disabled="false"
                          class="c48 c49"
                          data-strapi-expanded="false"
                        >
                          <div
                            class="c50 c51 c52 c53"
                            cursor=""
                          >
                            <div
                              class="c50 c54 c55 c56"
                              spacing="3"
                            >
                              <button
                                aria-controls="accordion-content-accordion-1"
                                aria-disabled="false"
                                aria-expanded="false"
                                aria-labelledby="accordion-label-accordion-1"
                                class="c50 c57 c55 c58 c59"
                                data-strapi-accordion-toggle="true"
                                type="button"
                              >
                                <span
                                  class="c60 c61"
                                >
                                  <span
                                    class="c60 sc-uWCef c62"
                                    id="accordion-label-accordion-1"
                                  >
                                    Address
                                  </span>
                                  <p
                                    class="c60 c63"
                                    id="accordion-desc-accordion-1"
                                  >
                                    Define all allowed actions for the api::address plugin.
                                  </p>
                                </span>
                              </button>
                              <div
                                class="c50 c55 c56"
                                spacing="3"
                              >
                                <span
                                  aria-hidden="true"
                                  class="c50 c64 c65"
                                  cursor="pointer"
                                  data-strapi-dropdown="true"
                                  height="2rem"
                                  width="2rem"
                                >
                                  <svg
                                    class="c66 c67"
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
                  class="c68"
                >
                  <div
                    class="c69"
                    style="min-height: 100%;"
                  >
                    <div
                      class="c19 c45"
                      spacing="2"
                    >
                      <h3
                        class="c23"
                      >
                        Advanced settings
                      </h3>
                      <p
                        class="c46"
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

  it('can toggle the permissions accordions and actions', async () => {
    // Create app and wait for loading
    const {
      getByLabelText,
      queryByText,
      getByTestId,
      getByText,
      getAllByRole,
    } = makeAndRenderApp();
    const loader = getByTestId('loader');
    await waitForElementToBeRemoved(loader);

    // Open the collapse
    const collapse = getByText(/define all allowed actions for the api::address plugin/i);
    await userEvent.click(collapse);
    expect(getByLabelText(/select all/i)).toBeInTheDocument();

    // Display the selected action's bound route
    const actionCogButton = getByTestId('action-cog');
    await userEvent.click(actionCogButton);
    expect(getByText(/bound route to/i)).toBeInTheDocument();
    expect(getByText('POST')).toBeInTheDocument();
    expect(getByText('/addresses')).toBeInTheDocument();

    // Select all actions with the "select all" checkbox
    const [selectAllCheckbox, ...actionCheckboxes] = getAllByRole('checkbox');
    expect(selectAllCheckbox.checked).toBe(false);
    await userEvent.click(selectAllCheckbox);
    actionCheckboxes.forEach(actionCheckbox => {
      expect(actionCheckbox.checked).toBe(true);
    });

    // Close the collapse
    await userEvent.click(collapse);
    expect(queryByText(/select all/i)).not.toBeInTheDocument();
  });
});
