import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createMemoryHistory } from 'history';
import { useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import ListPage from '../index';

jest.mock('../../../../../../hooks/useAdminUsers', () => ({
  __esModule: true,
  useAdminUsers: jest.fn().mockReturnValue({
    users: [
      {
        email: 'soup@strapi.io',
        firstname: 'soup',
        id: 1,
        isActive: true,
        lastname: 'soupette',
        roles: [
          {
            id: 1,
            name: 'Super Admin',
          },
        ],
      },
      {
        email: 'dummy@strapi.io',
        firstname: 'dummy',
        id: 2,
        isActive: false,
        lastname: 'dum test',
        roles: [
          {
            id: 1,
            name: 'Super Admin',
          },
          {
            id: 2,
            name: 'Editor',
          },
        ],
      },
    ],
    pagination: { page: 1, pageSize: 10, pageCount: 2, total: 2 },
    isLoading: false,
    isError: false,
  }),
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    act(() => history.push('/settings/user?pageSize=10&page=1&sort=firstname'));
    const app = makeApp(history);

    const { container } = render(app);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c19 {
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

      .c6 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c11 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 0;
        color: #ffffff;
      }

      .c12 {
        font-size: 1rem;
        line-height: 1.5;
        color: #666687;
      }

      .c39 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
      }

      .c43 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c51 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c58 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
      }

      .c63 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c69 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: revert;
        color: #32324d;
      }

      .c71 {
        font-size: 0.75rem;
        line-height: 1.33;
        line-height: revert;
        color: #32324d;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c3 {
        min-width: 0;
      }

      .c8 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c13 {
        padding-right: 56px;
        padding-bottom: 16px;
        padding-left: 56px;
      }

      .c16 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c20 {
        color: #32324d;
      }

      .c22 {
        padding-top: 4px;
        padding-bottom: 4px;
      }

      .c24 {
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
      }

      .c26 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c27 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c29 {
        position: relative;
      }

      .c31 {
        padding-right: 24px;
        padding-left: 24px;
      }

      .c40 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-width: 0;
        border-color: #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c46 {
        padding-left: 4px;
      }

      .c48 {
        padding-top: 16px;
      }

      .c53 {
        background: #ffffff;
        padding-right: 12px;
        padding-left: 12px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        width: 100%;
        cursor: default;
      }

      .c56 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c62 {
        padding-left: 8px;
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
        gap: 8px;
      }

      .c14 {
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

      .c15 {
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
        gap: 8px;
      }

      .c17 {
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

      .c25 {
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
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        gap: 8px;
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
        -webkit-box-pack: end;
        -webkit-justify-content: end;
        -ms-flex-pack: end;
        justify-content: end;
      }

      .c49 {
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

      .c50 {
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
        gap: 4px;
      }

      .c54 {
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
        gap: 16px;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c57 {
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
        gap: 12px;
      }

      .c64 {
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
        gap: 4px;
      }

      .c21 path {
        fill: #32324d;
      }

      .c9 {
        position: relative;
        outline: none;
      }

      .c9 > svg {
        height: 12px;
        width: 12px;
      }

      .c9 > svg > g,
      .c9 > svg path {
        fill: #ffffff;
      }

      .c9[aria-disabled='true'] {
        pointer-events: none;
      }

      .c9:after {
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

      .c9:focus-visible {
        outline: none;
      }

      .c9:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c37 {
        height: 18px;
        min-width: 18px;
        margin: 0;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c37:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c37:checked:after {
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

      .c37:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c37:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c37:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c37:indeterminate:after {
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

      .c37:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c37:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c10 {
        height: 2rem;
      }

      .c10 svg {
        height: 0.75rem;
        width: auto;
      }

      .c10[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c10[aria-disabled='true'] svg > g,.c10[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c10[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c10[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c10[aria-disabled='true']:active svg > g,.c10[aria-disabled='true']:active svg path {
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

      .c10 svg > g,
      .c10 svg path {
        fill: #ffffff;
      }

      .c23 {
        height: 2rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c23 svg {
        height: 0.75rem;
        width: auto;
      }

      .c23[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c23[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c23[aria-disabled='true'] svg > g,.c23[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c23[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c23[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c23[aria-disabled='true']:active svg > g,.c23[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c23:hover {
        background-color: #f6f6f9;
      }

      .c23:active {
        background-color: #eaeaef;
      }

      .c23 .c5 {
        color: #32324d;
      }

      .c23 svg > g,
      .c23 svg path {
        fill: #32324d;
      }

      .c52 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c55 {
        border: 1px solid #dcdce4;
        min-height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c55[aria-disabled='true'] {
        color: #666687;
      }

      .c55:focus-visible {
        outline: none;
      }

      .c55:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c61 > svg {
        width: 0.375rem;
      }

      .c61 > svg > path {
        fill: #666687;
      }

      .c59 {
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
      }

      .c60 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        gap: 4px;
        -webkit-flex-wrap: wrap;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
      }

      .c73[data-state='checked'] .c5 {
        font-weight: bold;
        color: #4945ff;
      }

      .c18 svg > g,
      .c18 svg path {
        fill: #8e8ea9;
      }

      .c18:hover svg > g,
      .c18:hover svg path {
        fill: #666687;
      }

      .c18:active svg > g,
      .c18:active svg path {
        fill: #a5a5ba;
      }

      .c18[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c0:focus-visible {
        outline: none;
      }

      .c65 {
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

      .c65:after {
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

      .c65:focus-visible {
        outline: none;
      }

      .c65:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c67 {
        padding: 12px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        -webkit-text-decoration: none;
        text-decoration: none;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        position: relative;
        outline: none;
      }

      .c67:after {
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

      .c67:focus-visible {
        outline: none;
      }

      .c67:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c68 {
        color: #271fe0;
        background: #ffffff;
      }

      .c68:hover {
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c70 {
        color: #32324d;
      }

      .c70:hover {
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c66 {
        font-size: 0.6875rem;
        pointer-events: none;
      }

      .c66 svg path {
        fill: #c0c0cf;
      }

      .c66:focus svg path,
      .c66:hover svg path {
        fill: #c0c0cf;
      }

      .c72 {
        font-size: 0.6875rem;
      }

      .c72 svg path {
        fill: #666687;
      }

      .c72:focus svg path,
      .c72:hover svg path {
        fill: #4a4a6a;
      }

      .c28 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c33 {
        width: 100%;
        white-space: nowrap;
      }

      .c30:before {
        background: linear-gradient(90deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        left: 0;
      }

      .c30:after {
        background: linear-gradient(270deg,#c0c0cf 0%,rgba(0,0,0,0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c32 {
        overflow-x: auto;
      }

      .c42 tr:last-of-type {
        border-bottom: none;
      }

      .c34 {
        border-bottom: 1px solid #eaeaef;
      }

      .c35 {
        border-bottom: 1px solid #eaeaef;
      }

      .c35 td,
      .c35 th {
        padding: 16px;
      }

      .c35 td:first-of-type,
      .c35 th:first-of-type {
        padding: 0 4px;
      }

      .c35 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 3.5rem;
      }

      .c36 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c36 input {
        vertical-align: sub;
      }

      .c38 svg {
        height: 0.25rem;
      }

      .c41 {
        -webkit-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        transform: rotate(0deg);
      }

      .c44 {
        margin-right: 12px;
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 50%;
        background: #328048;
      }

      .c47 {
        margin-right: 12px;
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 50%;
        background: #d02b20;
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
                class="c3 c4"
              >
                <h1
                  class="c5 c6"
                >
                  Users
                </h1>
              </div>
              <div
                class="c7"
              >
                <button
                  aria-disabled="false"
                  class="c8 c7 c9 c10"
                  data-testid="create-user-button"
                  type="button"
                >
                  <div
                    aria-hidden="true"
                    class=""
                  >
                    <svg
                      fill="none"
                      height="1rem"
                      viewBox="0 0 24 24"
                      width="1rem"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0 2.8A.8.8 0 0 1 .8 2h22.4a.8.8 0 0 1 .8.8v2.71a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V2.8Z"
                        fill="#32324D"
                      />
                      <path
                        d="M1.922 7.991C.197 6.675 0 6.252 0 5.289h23.953c.305 1.363-1.594 2.506-2.297 3.125-1.953 1.363-6.253 4.36-7.828 5.45-1.575 1.09-3.031.455-3.562 0-2.063-1.41-6.62-4.557-8.344-5.873ZM22.8 18H1.2c-.663 0-1.2.471-1.2 1.053v1.894C0 21.529.537 22 1.2 22h21.6c.663 0 1.2-.471 1.2-1.053v-1.894c0-.582-.537-1.053-1.2-1.053Z"
                        fill="#32324D"
                      />
                      <path
                        d="M0 9.555v10.972h24V9.554c-2.633 1.95-8.367 6.113-9.96 7.166-1.595 1.052-3.352.438-4.032 0L0 9.555Z"
                        fill="#32324D"
                      />
                    </svg>
                  </div>
                  <span
                    class="c5 c11"
                  >
                    Invite new user
                  </span>
                </button>
              </div>
            </div>
            <p
              class="c5 c12"
            >
              All the users who have access to the Strapi admin panel
            </p>
          </div>
        </div>
        <div
          class="c13 c14"
        >
          <div
            class="c15"
            wrap="wrap"
          >
            <span>
              <button
                aria-disabled="false"
                aria-labelledby=":r0:"
                class="c16 c17 c9 c18"
                tabindex="0"
                type="button"
              >
                <span
                  class="c19"
                >
                  Search
                </span>
                <svg
                  aria-hidden="true"
                  class="c20 c21"
                  fill="none"
                  focusable="false"
                  height="1rem"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clip-rule="evenodd"
                    d="m23.813 20.163-5.3-5.367a9.792 9.792 0 0 0 1.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 0 0 5.007-1.4l5.275 5.35a.634.634 0 0 0 .913 0l2.706-2.737a.641.641 0 0 0 0-.907ZM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062Z"
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
                class="c8 c7 c9 c23"
                type="button"
              >
                <div
                  aria-hidden="true"
                  class=""
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
                      d="M0 4a2 2 0 0 1 2-2h20a2 2 0 1 1 0 4H2a2 2 0 0 1-2-2Zm4 8a2 2 0 0 1 2-2h12a2 2 0 1 1 0 4H6a2 2 0 0 1-2-2Zm6 6a2 2 0 1 0 0 4h4a2 2 0 1 0 0-4h-4Z"
                      fill="#32324D"
                      fill-rule="evenodd"
                    />
                  </svg>
                </div>
                <span
                  class="c5 c11"
                >
                  Filters
                </span>
              </button>
            </div>
          </div>
          <div
            class="c24 c25"
            wrap="wrap"
          />
        </div>
        <div
          class="c26"
        >
          <div
            class="c27 c28"
          >
            <div
              class="c29 c30"
            >
              <div
                class="c31 c32"
              >
                <table
                  aria-colcount="8"
                  aria-rowcount="3"
                  class="c33"
                  role="grid"
                >
                  <thead
                    class="c34"
                  >
                    <tr
                      aria-rowindex="1"
                      class="c35"
                    >
                      <th
                        aria-colindex="1"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <div
                            class=""
                          >
                            <input
                              aria-label="Select all entries"
                              class="c37"
                              tabindex="0"
                              type="checkbox"
                            />
                          </div>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="2"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <span
                              aria-labelledby=":r2:"
                              class="c5 c39"
                              label="Firstname"
                              tabindex="-1"
                            >
                              Firstname
                            </span>
                          </span>
                          <span
                            class="c38"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby=":r4:"
                                class="c40 c17 c9 c18"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c19"
                                >
                                  Sort on Firstname
                                </span>
                                <svg
                                  aria-hidden="true"
                                  class="c41"
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
                        aria-colindex="3"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <button
                              aria-labelledby=":r6:"
                              class="c5 c39"
                              label="Lastname"
                              tabindex="-1"
                            >
                              Lastname
                            </button>
                          </span>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="4"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <button
                              aria-labelledby=":r8:"
                              class="c5 c39"
                              label="Email"
                              tabindex="-1"
                            >
                              Email
                            </button>
                          </span>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="5"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <span
                              aria-labelledby=":ra:"
                              class="c5 c39"
                              label="Roles"
                              tabindex="-1"
                            >
                              Roles
                            </span>
                          </span>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="6"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <button
                              aria-labelledby=":rc:"
                              class="c5 c39"
                              label="Username"
                              tabindex="-1"
                            >
                              Username
                            </button>
                          </span>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="7"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c4"
                        >
                          <span>
                            <span
                              aria-labelledby=":re:"
                              class="c5 c39"
                              label="User status"
                              tabindex="-1"
                            >
                              User status
                            </span>
                          </span>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                      <th
                        aria-colindex="8"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c4"
                        >
                          <div
                            class="c19"
                          >
                            Actions
                          </div>
                          <span
                            class="c38"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="c42"
                  >
                    <tr
                      aria-rowindex="2"
                      class="c35"
                      style="cursor: pointer;"
                    >
                      <td
                        aria-colindex="1"
                        aria-hidden="true"
                        class="c36"
                        role="button"
                      >
                        <div
                          class=""
                        >
                          <input
                            aria-label="Select soup soupette"
                            class="c37"
                            tabindex="-1"
                            type="checkbox"
                          />
                        </div>
                      </td>
                      <td
                        aria-colindex="2"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          soup
                        </span>
                      </td>
                      <td
                        aria-colindex="3"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          soupette
                        </span>
                      </td>
                      <td
                        aria-colindex="4"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          soup@strapi.io
                        </span>
                      </td>
                      <td
                        aria-colindex="5"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          Super Admin
                        </span>
                      </td>
                      <td
                        aria-colindex="6"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          -
                        </span>
                      </td>
                      <td
                        aria-colindex="7"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c4"
                        >
                          <div
                            class="c44"
                          />
                          <span
                            class="c5 c43"
                          >
                            Active
                          </span>
                        </div>
                      </td>
                      <td
                        aria-colindex="8"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c45"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby=":rg:"
                              class="c40 c17 c9 c18"
                              tabindex="-1"
                              type="button"
                            >
                              <span
                                class="c19"
                              >
                                Edit soup soupette
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 0 1 1.887 0l3.118 3.118ZM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0Z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                          <div
                            aria-hidden="true"
                            class="c46"
                            role="button"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby=":ri:"
                                class="c40 c17 c9 c18"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c19"
                                >
                                  Delete soup soupette
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
                    <tr
                      aria-rowindex="3"
                      class="c35"
                      style="cursor: pointer;"
                    >
                      <td
                        aria-colindex="1"
                        aria-hidden="true"
                        class="c36"
                        role="button"
                      >
                        <div
                          class=""
                        >
                          <input
                            aria-label="Select dummy dum test"
                            class="c37"
                            tabindex="-1"
                            type="checkbox"
                          />
                        </div>
                      </td>
                      <td
                        aria-colindex="2"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          dummy
                        </span>
                      </td>
                      <td
                        aria-colindex="3"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          dum test
                        </span>
                      </td>
                      <td
                        aria-colindex="4"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          dummy@strapi.io
                        </span>
                      </td>
                      <td
                        aria-colindex="5"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          Super Admin,
      Editor
                        </span>
                      </td>
                      <td
                        aria-colindex="6"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <span
                          class="c5 c43"
                        >
                          -
                        </span>
                      </td>
                      <td
                        aria-colindex="7"
                        class="c36"
                        role="gridcell"
                        tabindex="-1"
                      >
                        <div
                          class="c4"
                        >
                          <div
                            class="c47"
                          />
                          <span
                            class="c5 c43"
                          >
                            Inactive
                          </span>
                        </div>
                      </td>
                      <td
                        aria-colindex="8"
                        class="c36"
                        role="gridcell"
                      >
                        <div
                          class="c45"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby=":rk:"
                              class="c40 c17 c9 c18"
                              tabindex="-1"
                              type="button"
                            >
                              <span
                                class="c19"
                              >
                                Edit dummy dum test
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 0 1 1.887 0l3.118 3.118ZM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0Z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                          <div
                            aria-hidden="true"
                            class="c46"
                            role="button"
                          >
                            <span>
                              <button
                                aria-disabled="false"
                                aria-labelledby=":rm:"
                                class="c40 c17 c9 c18"
                                tabindex="-1"
                                type="button"
                              >
                                <span
                                  class="c19"
                                >
                                  Delete dummy dum test
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
          <div
            class="c48"
          >
            <div
              class="c49"
            >
              <div
                class="c4"
              >
                <div
                  class=""
                >
                  <div
                    class="c50"
                  >
                    <label
                      class="c5 c51 c52"
                      for=":rq:"
                    />
                    <div
                      aria-autocomplete="none"
                      aria-controls="radix-:rt:"
                      aria-describedby=":rq:-hint :rq:-error"
                      aria-expanded="false"
                      class="c53 c54 c55"
                      data-state="closed"
                      dir="ltr"
                      id=":rq:"
                      overflow="hidden"
                      role="combobox"
                      tabindex="0"
                    >
                      <span
                        class="c56 c57"
                      >
                        <span
                          class="c5 c58 c59"
                        >
                          <span
                            class="c60"
                          >
                            10
                          </span>
                        </span>
                      </span>
                      <span
                        class="c57"
                      >
                        <span
                          aria-hidden="true"
                          class="c61"
                        >
                          <svg
                            fill="none"
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
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  class="c62"
                >
                  <label
                    class="c5 c63"
                    for="page-size"
                  >
                    Entries per page
                  </label>
                </div>
              </div>
              <nav
                aria-label="Pagination"
                class=""
              >
                <ol
                  class="c64"
                >
                  <li>
                    <a
                      aria-current="page"
                      aria-disabled="true"
                      class="c65 c66 active"
                      href="/settings/user"
                      tabindex="-1"
                    >
                      <div
                        class="c19"
                      >
                        Go to previous page
                      </div>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="1rem"
                        viewBox="0 0 10 16"
                        width="1rem"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.88 14.12 3.773 8 9.88 1.88 8 0 0 8l8 8 1.88-1.88Z"
                          fill="#32324D"
                        />
                      </svg>
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current="page"
                      class="c67 c68 active"
                      href="/settings/user?pageSize=10&page=1&sort=firstname"
                    >
                      <div
                        class="c19"
                      >
                        Go to page 1
                      </div>
                      <span
                        aria-hidden="true"
                        class="c5 c69"
                      >
                        1
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current="page"
                      class="c65 c70 active"
                      href="/settings/user?pageSize=10&page=2&sort=firstname"
                    >
                      <div
                        class="c19"
                      >
                        Go to page 2
                      </div>
                      <span
                        aria-hidden="true"
                        class="c5 c71"
                      >
                        2
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current="page"
                      aria-disabled="false"
                      class="c65 c72 active"
                      href="/settings/user?pageSize=10&page=2&sort=firstname"
                    >
                      <div
                        class="c19"
                      >
                        Go to next page
                      </div>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="1rem"
                        viewBox="0 0 10 16"
                        width="1rem"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 1.88 6.107 8 0 14.12 1.88 16l8-8-8-8L0 1.88Z"
                          fill="#32324D"
                        />
                      </svg>
                    </a>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </main>
    `);
  });

  it('should show a list of users', async () => {
    const history = createMemoryHistory();
    act(() => history.push('/settings/user?pageSize=10&page=1&sort=firstname'));
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
    act(() => history.push('/settings/user?pageSize=10&page=1&sort=firstname'));
    const app = makeApp(history);

    const { queryByText } = render(app);

    expect(queryByText('Invite new user')).not.toBeInTheDocument();
  });
});
