import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createMemoryHistory } from 'history';
import { useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import ListPage from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(() => ({
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.mock('ee_else_ce/hooks/useLicenseLimitNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('ee_else_ce/pages/SettingsPage/pages/Users/ListPage/CreateAction', () => () => {
  return <></>;
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
                <Route path="/settings/user">
                  <ListPage />
                </Route>
              </Router>
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </TrackingProvider>
    </QueryClientProvider>
  );
};

describe('ADMIN | Pages | USERS | ListPage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => {
    server.close();
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { container } = render(app);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c15 {
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

      .c41 {
        -webkit-animation: gzYjWD 1s infinite linear;
        animation: gzYjWD 1s infinite linear;
        will-change: transform;
      }

      .c2 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c8 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c9 {
        padding-bottom: 16px;
      }

      .c16 {
        color: #32324d;
      }

      .c18 {
        padding-top: 4px;
        padding-bottom: 4px;
      }

      .c20 {
        padding-right: 8px;
      }

      .c23 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c25 {
        position: relative;
      }

      .c27 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c40 {
        background: #ffffff;
        padding: 64px;
      }

      .c42 {
        padding-top: 16px;
      }

      .c49 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c51 {
        padding-left: 12px;
      }

      .c54 {
        padding-left: 8px;
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c4 {
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

      .c10 {
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
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

      .c11 {
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
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c39 {
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

      .c43 {
        -webkit-align-items: flex-end;
        -webkit-box-align: flex-end;
        -ms-flex-align: flex-end;
        align-items: flex-end;
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

      .c44 {
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

      .c6 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c7 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c22 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c35 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
      }

      .c50 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c55 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c45 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c13 {
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

      .c13 svg {
        height: 12px;
        width: 12px;
      }

      .c13 svg > g,
      .c13 svg path {
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

      .c21 {
        height: 100%;
      }

      .c19 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c19 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c19 .c5 {
        color: #ffffff;
      }

      .c19[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c19[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c19[aria-disabled='true'] svg > g,.c19[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c19[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c19[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c19[aria-disabled='true']:active svg > g,.c19[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c19:hover {
        background-color: #f6f6f9;
      }

      .c19:active {
        background-color: #eaeaef;
      }

      .c19 .c5 {
        color: #32324d;
      }

      .c19 svg > g,
      .c19 svg path {
        fill: #32324d;
      }

      .c24 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c29 {
        width: 100%;
        white-space: nowrap;
      }

      .c26:before {
        background: linear-gradient(90deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c26:after {
        background: linear-gradient(270deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c28 {
        overflow-x: auto;
      }

      .c38 tr:last-of-type {
        border-bottom: none;
      }

      .c30 {
        border-bottom: 1px solid #eaeaef;
      }

      .c31 {
        border-bottom: 1px solid #eaeaef;
      }

      .c31 td,
      .c31 th {
        padding: 16px;
      }

      .c31 td:first-of-type,
      .c31 th:first-of-type {
        padding: 0 4px;
      }

      .c31 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 3.5rem;
      }

      .c32 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c32 input {
        vertical-align: sub;
      }

      .c34 svg {
        height: 0.25rem;
      }

      .c33 {
        height: 18px;
        min-width: 18px;
        margin: 0;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c33:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c33:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
        width: 10px;
        height: 10px;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c33:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c33:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c33:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c33:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c33:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c33:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c14 {
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
        height: 2rem;
        width: 2rem;
      }

      .c14 svg > g,
      .c14 svg path {
        fill: #8e8ea9;
      }

      .c14:hover svg > g,
      .c14:hover svg path {
        fill: #666687;
      }

      .c14:active svg > g,
      .c14:active svg path {
        fill: #a5a5ba;
      }

      .c14[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c14[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c36 {
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
        height: 2rem;
        width: 2rem;
        border: none;
      }

      .c36 svg > g,
      .c36 svg path {
        fill: #8e8ea9;
      }

      .c36:hover svg > g,
      .c36:hover svg path {
        fill: #666687;
      }

      .c36:active svg > g,
      .c36:active svg path {
        fill: #a5a5ba;
      }

      .c36[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c36[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c38 {
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
      }

      .c48 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c47:focus {
        outline: none;
      }

      .c47[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c46 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c46:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c52 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c52 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c52 svg path {
        fill: #666687;
      }

      .c53 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c53 svg {
        width: 0.375rem;
      }

      .c48 {
        width: 100%;
      }

      .c17 path {
        fill: #32324d;
      }

      .c56 > * + * {
        margin-left: 4px;
      }

      .c57 {
        padding: 12px;
        border-radius: 4px;
        -webkit-text-decoration: none;
        text-decoration: none;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        position: relative;
        outline: none;
      }

      .c57:after {
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

      .c57:focus-visible {
        outline: none;
      }

      .c57:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c58 {
        font-size: 0.7rem;
        pointer-events: none;
      }

      .c58 svg path {
        fill: #c0c0cf;
      }

      .c58:focus svg path,
      .c58:hover svg path {
        fill: #c0c0cf;
      }

      .c59 {
        font-size: 0.7rem;
      }

      .c59 svg path {
        fill: #666687;
      }

      .c59:focus svg path,
      .c59:hover svg path {
        fill: #4a4a6a;
      }

      .c12 > * + * {
        margin-left: 8px;
      }

      .c0:focus-visible {
        outline: none;
      }

      <main
        aria-busy="true"
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
                  class="c5 c6"
                >
                  Users
                </h1>
              </div>
            </div>
            <p
              class="c5 c7"
            >
              All the users who have access to the Strapi admin panel
            </p>
          </div>
        </div>
        <div
          class="c1 c8"
        >
          <div
            class="c1 c9"
          >
            <div
              class="c1 c10"
            >
              <div
                class="c1 c11 c12"
                wrap="wrap"
              >
                <span>
                  <button
                    aria-disabled="false"
                    aria-labelledby="0"
                    class="c13 c14"
                    tabindex="0"
                    type="button"
                  >
                    <span
                      class="c15"
                    >
                      Search
                    </span>
                    <svg
                      aria-hidden="true"
                      class="c1 c16 c17"
                      fill="none"
                      focusable="false"
                      height="1em"
                      viewBox="0 0 24 24"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        clip-rule="evenodd"
                        d="M23.813 20.163l-5.3-5.367a9.792 9.792 0 001.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 005.007-1.4l5.275 5.35a.634.634 0 00.913 0l2.706-2.737a.641.641 0 000-.907zM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062z"
                        fill="#32324D"
                        fill-rule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
                <div
                  class="c1 c18"
                >
                  <button
                    aria-disabled="false"
                    class="c13 c19"
                    type="button"
                  >
                    <div
                      aria-hidden="true"
                      class="c1 c20 c21"
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
                          d="M0 4a2 2 0 012-2h20a2 2 0 110 4H2a2 2 0 01-2-2zm4 8a2 2 0 012-2h12a2 2 0 110 4H6a2 2 0 01-2-2zm6 6a2 2 0 100 4h4a2 2 0 100-4h-4z"
                          fill="#32324D"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <span
                      class="c5 c22"
                    >
                      Filters
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="c1 c8"
        >
          <div
            class="c1 c23 c24"
          >
            <div
              class="c1 c25 c26"
            >
              <div
                class="c1 c27 c28"
              >
                <table
                  aria-colcount="8"
                  aria-rowcount="1"
                  class="c29"
                  role="grid"
                >
                  <thead
                    class="c30"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c1 c31"
                    >
                      <th
                        aria-colindex="1"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <div
                            class="c1 "
                          >
                            <input
                              aria-label="Select all entries"
                              class="c33"
                              tabindex="0"
                              type="checkbox"
                            />
                          </div>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c1 c32"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <span
                              aria-labelledby="1"
                              class="c5 c35"
                              label="Firstname"
                              tabindex="-1"
                            >
                              Firstname
                            </span>
                          </span>
                          <span
                            class="c34"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby="2"
                                class="c13 c36"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c15"
                                >
                                  Sort on Firstname
                                </span>
                                <svg
                                  aria-hidden="true"
                                  class="c37"
                                  fill="none"
                                  focusable="false"
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
                            </span>
                          </span>
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <button
                              aria-labelledby="3"
                              class="c5 c35"
                              label="Lastname"
                              tabindex="-1"
                            >
                              Lastname
                            </button>
                          </span>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <button
                              aria-labelledby="4"
                              class="c5 c35"
                              label="Email"
                              tabindex="-1"
                            >
                              Email
                            </button>
                          </span>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="5"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <span
                              aria-labelledby="5"
                              class="c5 c35"
                              label="Roles"
                              tabindex="-1"
                            >
                              Roles
                            </span>
                          </span>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="6"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <button
                              aria-labelledby="6"
                              class="c5 c35"
                              label="Username"
                              tabindex="-1"
                            >
                              Username
                            </button>
                          </span>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="7"
                        class="c1 c32"
                        role="gridcell"
                      >
                        <div
                          class="c1 c4"
                        >
                          <span>
                            <span
                              aria-labelledby="7"
                              class="c5 c35"
                              label="User status"
                              tabindex="-1"
                            >
                              User status
                            </span>
                          </span>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="8"
                        class="c1 c32"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c4"
                        >
                          <div
                            class="c15"
                          >
                            Actions
                          </div>
                          <span
                            class="c34"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c38"
                  >
                    <tr
                      aria-rowindex="2"
                      class="c1 c31"
                    >
                      <td
                        aria-colindex="1"
                        class="c1 c32"
                        colspan="8"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c1 c39"
                        >
                          <div
                            class="c1 c40"
                          >
                            <div
                              aria-live="assertive"
                              role="alert"
                            >
                              <div
                                class="c15"
                              >
                                Loading content...
                              </div>
                              <img
                                aria-hidden="true"
                                class="c41"
                                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjMiIGhlaWdodD0iNjMiIHZpZXdCb3g9IjAgMCA2MyA2MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQyLjU1NjMgMTEuOTgxNkMzOS40ODQgMTAuMzA3MSAzNS44NTc1IDkuMjkwOTcgMzIuMzM1NCA5LjEzNTIxQzI4LjY0NDMgOC45Mjg4OCAyNC44Mjk1IDkuNzIzMTggMjEuMzMzNiAxMS40MTI5QzIwLjkxMjMgMTEuNTkwMSAyMC41Mzc2IDExLjgxMDEgMjAuMTcyMiAxMi4wMjQ5TDIwLjAxMDggMTIuMTE3OUMxOS44Nzc0IDEyLjE5NTEgMTkuNzQ0MSAxMi4yNzI0IDE5LjYwOCAxMi4zNTM2QzE5LjMyNTMgMTIuNTE0NiAxOS4wNDkyIDEyLjY3NDQgMTguNzU0NCAxMi44NzkyQzE4LjU0NjMgMTMuMDMyOSAxOC4zMzk1IDEzLjE3NTkgMTguMTMwMSAxMy4zMjNDMTcuNTY1OCAxMy43MjA4IDE2Ljk4NjggMTQuMTMxNyAxNi40OTgzIDE0LjU5NzlDMTQuODQ3NiAxNS45NTI0IDEzLjU1NzEgMTcuNjA3NSAxMi42MDcxIDE4LjkyMTRDMTAuNDM2NSAyMi4xNTY2IDkuMDg2MjIgMjUuOTU2NyA4LjgwNzAyIDI5LjYxNDNMOC43NzY0IDMwLjE1ODhDOC43MzMyOCAzMC45MTk2IDguNjg0NzYgMzEuNzA1NyA4Ljc1MzUzIDMyLjQ1NTVDOC43NjY0OCAzMi42MDg0IDguNzY2MSAzMi43NjM4IDguNzc1MDYgMzIuOTE0QzguNzg4OTUgMzMuMjI5IDguODAxNTIgMzMuNTM3MyA4Ljg0NiAzMy44NjcyTDkuMDczOTYgMzUuNDIyMUM5LjA5NzU2IDM1LjU3NjQgOS4xMTk4IDM1Ljc0MTMgOS4xNjMzIDM1LjkyNjNMOS42NTkxOSAzNy45MjcyTDEwLjEzOCAzOS4yODIzQzEwLjI3MjkgMzkuNjY3MyAxMC40MTU4IDQwLjA3NTEgMTAuNiA0MC40M0MxMi4wMjkyIDQzLjYzNyAxNC4xNDI1IDQ2LjQ1NzggMTYuNzA2MyA0OC41ODVDMTkuMDUwOCA1MC41Mjk2IDIxLjgyNCA1Mi4wMDIzIDI0Ljc0OTEgNTIuODQ1MkwyNi4yMzcxIDUzLjIzNzZDMjYuMzc4MSA1My4yNjkzIDI2LjQ5MjYgNTMuMjg4OSAyNi42MDMxIDUzLjMwNThMMjYuNzc3NSA1My4zMzExQzI3LjAwNTIgNTMuMzYzNiAyNy4yMTk1IDUzLjM5ODYgMjcuNDQ0NSA1My40MzVDMjcuODU5OCA1My41MDc2IDI4LjI2NzIgNTMuNTc0OCAyOC43MDc5IDUzLjYxODNMMzAuNTY0MSA1My43MjI5QzMwLjk1MTYgNTMuNzI0OSAzMS4zMzUyIDUzLjcwNjggMzEuNzA4MSA1My42ODc0QzMxLjkwMzkgNTMuNjgxIDMyLjA5ODQgNTMuNjY4MSAzMi4zMjg4IDUzLjY2MkMzNC41MjUzIDUzLjQ3NzIgMzYuNTEwNiA1My4wNjM0IDM4LjA1MTYgNTIuNDY1MkMzOC4xNzY5IDUyLjQxNzEgMzguMzAwOCA1Mi4zNzk2IDM4LjQyMzQgNTIuMzM1NUMzOC42NzI3IDUyLjI0OTkgMzguOTI1OSA1Mi4xNjcgMzkuMTQzMiA1Mi4wNTk5TDQwLjg1OTEgNTEuMjYyNkw0Mi41NzAyIDUwLjI2NkM0Mi45MDA5IDUwLjA2ODIgNDMuMDIwNSA0OS42NDE0IDQyLjgyODIgNDkuMjk4NEM0Mi42MzIgNDguOTUyNiA0Mi4yMDM0IDQ4LjgzMDggNDEuODYzNCA0OS4wMTY2TDQwLjE3OTIgNDkuOTIxOEwzOC40OTk1IDUwLjYyMjRDMzguMzE2OSA1MC42OTUzIDM4LjEyMSA1MC43NTM0IDM3LjkyMjQgNTAuODE1NUMzNy43ODM4IDUwLjg0ODkgMzcuNjUxOCA1MC44OTgzIDM3LjUwMTIgNTAuOTQwOEMzNi4wNzExIDUxLjQzNSAzNC4yNDQ1IDUxLjc0MjUgMzIuMjQ0IDUxLjgzNDZDMzIuMDQ0MiA1MS44MzgzIDMxLjg0NzEgNTEuODM3OSAzMS42NTQgNTEuODQwM0MzMS4zMDUxIDUxLjg0MTQgMzAuOTYwMiA1MS44NDUxIDMwLjYzOTIgNTEuODMwNUwyOC45MTc3IDUxLjY3MjVDMjguNTQ3NiA1MS42MTkgMjguMTY5NSA1MS41NDI3IDI3Ljc4NDggNTEuNDY3OEMyNy41NjM5IDUxLjQxNjcgMjcuMzM3NiA1MS4zNzM3IDI3LjEyOTkgNTEuMzM3NEwyNi45NTI5IDUxLjI5ODdDMjYuODcwNCA1MS4yODM0IDI2Ljc3NzIgNTEuMjY2NyAyNi43MzMzIDUxLjI1NDNMMjUuMzQ2NiA1MC44MzIyQzIyLjc2NTEgNDkuOTc4OSAyMC4zMyA0OC41NzI5IDE4LjI5NDIgNDYuNzU1N0MxNi4xMDU2IDQ0Ljc5NTEgMTQuMzMzOSA0Mi4yMzM1IDEzLjE3NDIgMzkuMzU4MkMxMi4wMjc2IDM2LjYwMTMgMTEuNTk4OCAzMy4yNzkyIDExLjk3MTYgMzAuMDA3NkMxMi4zMTQ1IDI3LjAyMTMgMTMuMzk0OCAyNC4xNjM1IDE1LjE4NTggMjEuNTA4M0MxNS4zMDM0IDIxLjMzMzkgMTUuNDIxIDIxLjE1OTYgMTUuNTIxMiAyMS4wMTk2QzE2LjQzMDkgMTkuODY4OCAxNy41NDA4IDE4LjU1ODkgMTguOTQ4MyAxNy40OTZDMTkuMzM2NyAxNy4xNTI1IDE5Ljc4NjIgMTYuODU2IDIwLjI2MTEgMTYuNTQ3OEMyMC40ODc4IDE2LjQwMDkgMjAuNzA3OSAxNi4yNTUzIDIwLjg5MDcgMTYuMTMwNkMyMS4wOTc0IDE2LjAwNDggMjEuMzE4OCAxNS44ODMxIDIxLjUzNDggMTUuNzY5NEMyMS42NzYxIDE1LjY5NzUgMjEuODE2MiAxNS42MTkgMjEuOTM4OCAxNS41NTc2TDIyLjEwMDIgMTUuNDY0NkMyMi40MDAyIDE1LjMwMzcgMjIuNjc0OSAxNS4xNTQ2IDIyLjk5MDggMTUuMDM5TDI0LjExODYgMTQuNTcxNUMyNC4zMzk5IDE0LjQ4NDQgMjQuNTcxOCAxNC40MTU5IDI0Ljc5OTcgMTQuMzQ0N0MyNC45NTMgMTQuMjk4MiAyNS4wOTgyIDE0LjI2MzUgMjUuMjYzNSAxNC4yMDc4QzI1Ljc4NiAxNC4wMTgyIDI2LjMyODMgMTMuOTExMiAyNi45MTA1IDEzLjc5NjVDMjcuMTE3IDEzLjc1NzEgMjcuMzMwMiAxMy43MTYzIDI3LjU2MDggMTMuNjU4NUMyNy43NTUzIDEzLjYxMSAyNy45NzM3IDEzLjU5NjkgMjguMjA4MiAxMy41NzYyQzI4LjM2NCAxMy41NjAzIDI4LjUxNzIgMTMuNTQ4MyAyOC42MzE4IDEzLjUzMzNDMjguNzg3NiAxMy41MTczIDI4LjkzNDIgMTMuNTA2NiAyOS4wOTI3IDEzLjQ4NjdDMjkuMzI4NSAxMy40NTU1IDI5LjU0NTYgMTMuNDM0NyAyOS43NDk0IDEzLjQzMzdDMzAuMDIzNyAxMy40NCAzMC4yOTk0IDEzLjQzNTcgMzAuNTc3NyAxMy40Mjc0QzMxLjA4MTEgMTMuNDIxIDMxLjU1NzkgMTMuNDE5NyAzMi4wMzE4IDEzLjQ5MTRDMzQuOTY2NCAxMy43MzUyIDM3LjcxNDQgMTQuNjA4NSA0MC4yMDUyIDE2LjA4NjhDNDIuMzQ4OSAxNy4zNjU1IDQ0LjI3MTYgMTkuMTUyNSA0NS43NjA3IDIxLjI2NEM0Ny4wMjU1IDIzLjA2MjggNDcuOTc1NiAyNS4wNTI4IDQ4LjQ5MjggMjcuMDM5M0M0OC41NzIgMjcuMzE3NiA0OC42Mjk5IDI3LjU5MzEgNDguNjgzOSAyNy44NjU5QzQ4LjcxNTQgMjguMDQyOCA0OC43NTYzIDI4LjIxNDUgNDguNzg5MiAyOC4zNjM2QzQ4LjgwMzcgMjguNDU0MSA0OC44MjA4IDI4LjU0MDYgNDguODQ0NSAyOC42MjU4QzQ4Ljg3NDkgMjguNzQ0MyA0OC44OTg2IDI4Ljg2NCA0OC45MTE2IDI4Ljk2NTFMNDguOTc5MyAyOS42MDQ3QzQ4Ljk5MjIgMjkuNzc0OCA0OS4wMTMyIDI5LjkzMzEgNDkuMDMwMSAzMC4wODg3QzQ5LjA2NjggMzAuMzI2OCA0OS4wODg5IDMwLjU2MDggNDkuMDk2NCAzMC43NTYxTDQ5LjEwODMgMzEuOTAwMUM0OS4xMzEyIDMyLjMzMDcgNDkuMDg5IDMyLjcxMTYgNDkuMDUyMiAzMy4wNjczQzQ5LjAzODQgMzMuMjU5OCA0OS4wMTI2IDMzLjQ0NDMgNDkuMDEyMyAzMy41ODI0QzQ4Ljk5NjEgMzMuNjkyNiA0OC45OTE4IDMzLjc5MzUgNDguOTgzNiAzMy44OTE3QzQ4Ljk3NTMgMzQuMDA3MiA0OC45NzI0IDM0LjExNDggNDguOTQxNCAzNC4yNTU0TDQ4LjU0NDkgMzYuMzA1OUM0OC4zMTM0IDM3Ljg2MjMgNDkuMzc5MyAzOS4zMzY1IDUwLjk0ODggMzkuNTgyMkM1Mi4wNDE3IDM5Ljc2MDEgNTMuMTUzNiAzOS4yODE5IDUzLjc3MTEgMzguMzY2NEM1NC4wMDYzIDM4LjAxNzYgNTQuMTYwNCAzNy42MjU3IDU0LjIyMjcgMzcuMjA2NEw1NC41MjE3IDM1LjI1NzRDNTQuNTUxNCAzNS4wNzU2IDU0LjU3MiAzNC44MyA1NC41ODQ2IDM0LjU3OTFMNTQuNjAyOCAzNC4yMzM4QzU0LjYwOTggMzQuMDU5OCA1NC42MjIzIDMzLjg3NzkgNTQuNjM0NyAzMy42Nzg4QzU0LjY3MzQgMzMuMTA1MiA1NC43MTYzIDMyLjQ0NzkgNTQuNjYxOSAzMS44MDU4TDU0LjU4NjcgMzAuNDI4OUM1NC41NjIyIDMwLjA5NTIgNTQuNTA5NyAyOS43NiA1NC40NTU5IDI5LjQxODFDNTQuNDMxIDI5LjI1NzIgNTQuNDA0OCAyOS4wODk2IDU0LjM4MjYgMjguOTA3NEw1NC4yNjg3IDI4LjEwNEM1NC4yMzMyIDI3LjkyNDQgNTQuMTgwNCAyNy43MjczIDU0LjEzMjkgMjcuNTM5Nkw1NC4wNjQzIDI3LjI0NTRDNTQuMDE5NSAyNy4wNzEgNTMuOTc3MyAyNi44OTI3IDUzLjkzMzggMjYuNzA3NkM1My44NDU1IDI2LjMzMDkgNTMuNzQ3OSAyNS45NDIyIDUzLjYxMyAyNS41NTcxQzUyLjg0IDIzLjAyOTIgNTEuNTM4MyAyMC41MTk0IDQ5LjgzMzggMTguMjc5OUM0Ny44NTQ0IDE1LjY4MiA0NS4zMzMzIDEzLjUwODcgNDIuNTU2MyAxMS45ODE2WiIgZmlsbD0iIzQ5NDVGRiIvPgo8L3N2Zz4K"
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div
            class="c1 c42"
          >
            <div
              class="c1 c43"
            >
              <div
                class="c1 c4"
              >
                <div>
                  <div
                    class="c1 c44 c45"
                  >
                    <div
                      class="c1 c4 c46"
                    >
                      <button
                        aria-disabled="false"
                        aria-expanded="false"
                        aria-haspopup="listbox"
                        aria-label="Entries per page"
                        aria-labelledby="11 11-label 11-content"
                        class="c47"
                        id="11"
                        type="button"
                      />
                      <div
                        class="c1 c3 c48"
                      >
                        <div
                          class="c1 c4"
                        >
                          <div
                            class="c1 c49"
                          >
                            <span
                              class="c5 c50"
                              id="11-content"
                            >
                              10
                            </span>
                          </div>
                        </div>
                        <div
                          class="c1 c4"
                        >
                          <button
                            aria-hidden="true"
                            class="c1 c51 c52 c53"
                            tabindex="-1"
                            title="Carret Down Button"
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
                  </div>
                </div>
                <div
                  class="c1 c54"
                >
                  <label
                    class="c5 c55"
                    for="page-size"
                  >
                    Entries per page
                  </label>
                </div>
              </div>
              <nav
                aria-label="pagination"
                class=""
              >
                <ul
                  class="c1 c4 c56"
                >
                  <li>
                    <a
                      aria-current="page"
                      aria-disabled="true"
                      class="c57 c58 active"
                      href="/settings/user"
                      tabindex="-1"
                    >
                      <div
                        class="c15"
                      >
                        Go to previous page
                      </div>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="1em"
                        viewBox="0 0 10 16"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.88 14.12L3.773 8 9.88 1.88 8 0 0 8l8 8 1.88-1.88z"
                          fill="#32324D"
                        />
                      </svg>
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current="page"
                      aria-disabled="false"
                      class="c57 c59 active"
                      href="/settings/user?pageSize=10&page=1&sort=firstname"
                    >
                      <div
                        class="c15"
                      >
                        Go to next page
                      </div>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="1em"
                        viewBox="0 0 10 16"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 1.88L6.107 8 0 14.12 1.88 16l8-8-8-8L0 1.88z"
                          fill="#32324D"
                        />
                      </svg>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </main>
    `);
  });

  it('should show a list of users', async () => {
    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { getByText } = render(app);

    await waitFor(() => {
      expect(getByText('soup')).toBeInTheDocument();
      expect(getByText('dummy')).toBeInTheDocument();
      expect(getByText('Active')).toBeInTheDocument();
      expect(getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canCreate: false, canDelete: true, canRead: true, canUpdate: true },
    }));

    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { queryByTestId } = render(app);

    await waitFor(() => {
      expect(queryByTestId('create-user-button')).not.toBeInTheDocument();
    });
  });
});
