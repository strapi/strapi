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
      .c43 {
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

      .c44 {
        -webkit-animation: gzYjWD 1s infinite linear;
        animation: gzYjWD 1s infinite linear;
        will-change: transform;
      }

      .c41 {
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

      .c46 {
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

      .c47 {
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

      .c36 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c61 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
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

      .c23 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c23 .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c23 .c10 {
        color: #ffffff;
      }

      .c23[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c23[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c23[aria-disabled='true'] svg > g,
      .c23[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c23[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c23[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c23[aria-disabled='true']:active svg > g,
      .c23[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c23:hover {
        background-color: #f6f6f9;
      }

      .c23:active {
        background-color: #eaeaef;
      }

      .c23 .c10 {
        color: #32324d;
      }

      .c23 svg > g,
      .c23 svg path {
        fill: #32324d;
      }

      .c22 {
        padding-top: 4px;
        padding-bottom: 4px;
      }

      .c42 {
        background: #ffffff;
        padding: 64px;
      }

      .c45 {
        padding-top: 16px;
      }

      .c60 {
        padding-left: 8px;
      }

      .c24 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c27 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c25 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c29 {
        width: 100%;
        white-space: nowrap;
      }

      .c26 {
        position: relative;
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

      .c40 tr:last-of-type {
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

      .c33 {
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

      .c32 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c32 input {
        vertical-align: sub;
      }

      .c35 svg {
        height: 0.25rem;
      }

      .c34 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c34:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c34:checked:after {
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

      .c34:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c34:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c34:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c34:indeterminate:after {
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

      .c34:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c34:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c18 {
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

      .c18 svg {
        height: 12px;
        width: 12px;
      }

      .c18 svg > g,
      .c18 svg path {
        fill: #ffffff;
      }

      .c18[aria-disabled='true'] {
        pointer-events: none;
      }

      .c18:after {
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

      .c18:focus-visible {
        outline: none;
      }

      .c18:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c19 {
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

      .c19 svg > g,
      .c19 svg path {
        fill: #8e8ea9;
      }

      .c19:hover svg > g,
      .c19:hover svg path {
        fill: #666687;
      }

      .c19:active svg > g,
      .c19:active svg path {
        fill: #a5a5ba;
      }

      .c19[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c19[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c37 {
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

      .c37 svg > g,
      .c37 svg path {
        fill: #8e8ea9;
      }

      .c37:hover svg > g,
      .c37:hover svg path {
        fill: #666687;
      }

      .c37:active svg > g,
      .c37:active svg path {
        fill: #a5a5ba;
      }

      .c37[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c37[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c39 {
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

      .c52 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c52:focus {
        outline: none;
      }

      .c52[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c55 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c57 {
        padding-left: 12px;
      }

      .c48 {
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

      .c50 {
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

      .c53 {
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

      .c56 {
        color: #32324d;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c49 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c51 {
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

      .c51:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c58 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c58 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c58 svg path {
        fill: #666687;
      }

      .c59 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c59 svg {
        width: 0.375rem;
      }

      .c54 {
        width: 100%;
      }

      .c20 {
        color: #32324d;
      }

      .c21 path {
        fill: #32324d;
      }

      .c62 {
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

      .c63 > * + * {
        margin-left: 4px;
      }

      .c66 {
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

      .c64 {
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

      .c64:after {
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

      .c64:focus-visible {
        outline: none;
      }

      .c64:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c65 {
        font-size: 0.7rem;
        pointer-events: none;
      }

      .c65 svg path {
        fill: #c0c0cf;
      }

      .c65:focus svg path,
      .c65:hover svg path {
        fill: #c0c0cf;
      }

      .c67 {
        font-size: 0.7rem;
      }

      .c67 svg path {
        fill: #666687;
      }

      .c67:focus svg path,
      .c67:hover svg path {
        fill: #4a4a6a;
      }

      .c38 {
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
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

      .c14 {
        padding-bottom: 16px;
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

      .c15 {
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

      .c16 {
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

      .c17 > * + * {
        margin-left: 8px;
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
                  Users
                </h1>
              </div>
              <button
                aria-disabled="false"
                class="c5 c6"
                data-testid="create-user-button"
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
                      d="M0 2.8A.8.8 0 01.8 2h22.4a.8.8 0 01.8.8v2.71a1 1 0 01-1 1H1a1 1 0 01-1-1V2.8z"
                      fill="#32324D"
                    />
                    <path
                      d="M1.922 7.991C.197 6.675 0 6.252 0 5.289h23.953c.305 1.363-1.594 2.506-2.297 3.125-1.953 1.363-6.253 4.36-7.828 5.45-1.575 1.09-3.031.455-3.562 0-2.063-1.41-6.62-4.557-8.344-5.873zM22.8 18H1.2c-.663 0-1.2.471-1.2 1.053v1.894C0 21.529.537 22 1.2 22h21.6c.663 0 1.2-.471 1.2-1.053v-1.894c0-.582-.537-1.053-1.2-1.053z"
                      fill="#32324D"
                    />
                    <path
                      d="M0 9.555v10.972h24V9.554c-2.633 1.95-8.367 6.113-9.96 7.166-1.595 1.052-3.352.438-4.032 0L0 9.555z"
                      fill="#32324D"
                    />
                  </svg>
                </div>
                <span
                  class="c10 c11"
                >
                  Invite new user
                </span>
              </button>
            </div>
            <p
              class="c12"
            >
              All the users who have access to the Strapi admin panel
            </p>
          </div>
        </div>
        <div
          class="c13"
        >
          <div
            class="c14"
          >
            <div
              class="c15"
            >
              <div
                class="c16 c17"
                wrap="wrap"
              >
                <span>
                  <button
                    aria-disabled="false"
                    aria-labelledby="tooltip-1"
                    class="c18 c19"
                    tabindex="0"
                    type="button"
                  >
                    <svg
                      class="c20 c21"
                      fill="none"
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
                  class="c22"
                >
                  <button
                    aria-disabled="false"
                    class="c5 c23"
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
                          clip-rule="evenodd"
                          d="M0 4a2 2 0 012-2h20a2 2 0 110 4H2a2 2 0 01-2-2zm4 8a2 2 0 012-2h12a2 2 0 110 4H6a2 2 0 01-2-2zm6 6a2 2 0 100 4h4a2 2 0 100-4h-4z"
                          fill="#32324D"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <span
                      class="c10 c11"
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
          class="c13"
        >
          <div
            class="c24 c25"
          >
            <div
              class="c26"
            >
              <div
                class="c27 c28"
              >
                <table
                  aria-colcount="8"
                  aria-rowcount="1"
                  class="c29"
                >
                  <thead
                    class="c30"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c31"
                    >
                      <th
                        aria-colindex="1"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <input
                            aria-label="Select all entries"
                            class="c34"
                            tabindex="0"
                            type="checkbox"
                          />
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c32"
                        tabindex="-1"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <span
                              aria-labelledby="tooltip-1"
                              class="c36"
                              label="Firstname"
                              tabindex="-1"
                            >
                              Firstname
                            </span>
                          </span>
                          <span
                            class="c35"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby="tooltip-3"
                                class="c18 c37"
                                tabindex="-1"
                                type="button"
                              >
                                <svg
                                  class="c38"
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
                            </span>
                          </span>
                        </div>
                      </th>
                      <th
                        aria-colindex="3"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <button
                              aria-labelledby="tooltip-3"
                              class="c36"
                              label="Lastname"
                              tabindex="-1"
                            >
                              Lastname
                            </button>
                          </span>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <button
                              aria-labelledby="tooltip-5"
                              class="c36"
                              label="Email"
                              tabindex="-1"
                            >
                              Email
                            </button>
                          </span>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="5"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <span
                              aria-labelledby="tooltip-7"
                              class="c36"
                              label="Roles"
                              tabindex="-1"
                            >
                              Roles
                            </span>
                          </span>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="6"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <button
                              aria-labelledby="tooltip-9"
                              class="c36"
                              label="Username"
                              tabindex="-1"
                            >
                              Username
                            </button>
                          </span>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="7"
                        class="c32"
                      >
                        <div
                          class="c33"
                        >
                          <span>
                            <span
                              aria-labelledby="tooltip-11"
                              class="c36"
                              label="User status"
                              tabindex="-1"
                            >
                              User status
                            </span>
                          </span>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="8"
                        class="c32"
                        tabindex="-1"
                      >
                        <div
                          class="c33"
                        >
                          <div
                            class="c39"
                          >
                            Actions
                          </div>
                          <span
                            class="c35"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c40"
                  >
                    <tr
                      aria-rowindex="2"
                      class="c31"
                    >
                      <td
                        aria-colindex="1"
                        class="c32"
                        colspan="8"
                        tabindex="-1"
                      >
                        <div
                          class="c41"
                        >
                          <div
                            class="c42"
                          >
                            <div
                              aria-live="assertive"
                              role="alert"
                            >
                              <div
                                class="c43"
                              >
                                Loading content...
                              </div>
                              <img
                                aria-hidden="true"
                                class="c44"
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
            class="c45"
          >
            <div
              class="c46"
            >
              <div
                class="c47"
              >
                <div>
                  <div
                    class="c48 c49"
                  >
                    <div
                      class="c50 c51"
                    >
                      <button
                        aria-disabled="false"
                        aria-expanded="false"
                        aria-haspopup="listbox"
                        aria-label="Entries per page"
                        aria-labelledby="select-1-label select-1-content"
                        class="c52"
                        id="select-1"
                        type="button"
                      />
                      <div
                        class="c53 c54"
                      >
                        <div
                          class="c50"
                        >
                          <div
                            class="c55"
                          >
                            <span
                              class="c56"
                              id="select-1-content"
                            >
                              10
                            </span>
                          </div>
                        </div>
                        <div
                          class="c50"
                        >
                          <button
                            aria-hidden="true"
                            class="c57 c58 c59"
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
                  </div>
                </div>
                <div
                  class="c60"
                >
                  <label
                    class="c61"
                    for="page-size"
                  >
                    Entries per page
                  </label>
                </div>
              </div>
              <nav
                aria-label="pagination"
                class="sc-haTkiu"
              >
                <ul
                  class="c62 c63"
                >
                  <li>
                    <a
                      aria-current="page"
                      aria-disabled="true"
                      class="c64 c65 active"
                      href="/settings/user"
                      tabindex="-1"
                    >
                      <div
                        class="c66"
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
                      class="c64 c67 active"
                      href="/settings/user?pageSize=10&page=1&sort=firstname"
                    >
                      <div
                        class="c66"
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
