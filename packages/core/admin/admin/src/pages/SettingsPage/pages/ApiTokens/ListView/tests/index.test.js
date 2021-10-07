import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { useRBAC } from '@strapi/helper-plugin';
import { QueryClient, QueryClientProvider } from 'react-query';
import { subMinutes } from 'date-fns';
import { axiosInstance } from '../../../../../../core/utils';
import Theme from '../../../../../../components/Theme';
import ListView from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(() => ({
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.spyOn(axiosInstance, 'get').mockResolvedValue({
  data: {
    data: [
      {
        id: 1,
        name: 'My super token',
        description: 'This describe my super token',
        type: 'read-only',
        createdAt: new Date(subMinutes(new Date(), 5)).toDateString(),
      },
    ],
  },
});

jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01T08:00:00.000Z'));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const makeApp = history => {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
        <Theme>
          <Router history={history}>
            <Route path="/settings/api-tokens">
              <ListView />
            </Route>
          </Router>
        </Theme>
      </IntlProvider>
    </QueryClientProvider>
  );
};

describe('ADMIN | Pages | API TOKENS | ListPage', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    history.push('/settings/api-tokens');
    const app = makeApp(history);

    const { container } = render(app);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c27 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c24 {
        padding-right: 8px;
      }

      .c21 {
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

      .c21 svg {
        height: 12px;
        width: 12px;
      }

      .c21 svg > g,
      .c21 svg path {
        fill: #ffffff;
      }

      .c21[aria-disabled='true'] {
        pointer-events: none;
      }

      .c21:after {
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

      .c21:focus-visible {
        outline: none;
      }

      .c21:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c25 {
        height: 100%;
      }

      .c22 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
      }

      .c22 .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c22 .c26 {
        color: #ffffff;
      }

      .c22[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c22[aria-disabled='true'] .c26 {
        color: #666687;
      }

      .c22[aria-disabled='true'] svg > g,
      .c22[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c22[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c22[aria-disabled='true']:active .c26 {
        color: #666687;
      }

      .c22[aria-disabled='true']:active svg > g,
      .c22[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c22:hover {
        background-color: #ffffff;
      }

      .c22:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c22:active .c26 {
        color: #4945ff;
      }

      .c22:active svg > g,
      .c22:active svg path {
        fill: #4945ff;
      }

      .c22 .c26 {
        color: #271fe0;
      }

      .c22 svg > g,
      .c22 svg path {
        fill: #271fe0;
      }

      .c20 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
      }

      .c15 {
        background: #ffffff;
        padding: 64px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c17 {
        padding-bottom: 24px;
      }

      .c19 {
        padding-bottom: 16px;
      }

      .c16 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-align: center;
      }

      .c18 svg {
        height: 5.5rem;
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
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-align: center;
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

      .c0 {
        outline: none;
      }

      .c10 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c11 {
        font-weight: 600;
        line-height: 1.14;
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

      .c6 {
        padding: 10px 16px;
        background: #4945ff;
        border: none;
        border-radius: 4px;
        border: 1px solid #4945ff;
        background: #4945ff;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
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

      .c6 .c9 {
        color: #ffffff;
      }

      .c6[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c6[aria-disabled='true'] .c9 {
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

      .c6[aria-disabled='true']:active .c9 {
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
                  id="main-content-title"
                >
                  API Tokens
                </h1>
              </div>
              <a
                aria-disabled="false"
                class="c5 c6"
                data-testid="create-api-token-button"
                href="/settings/api-tokens/create"
                variant="default"
              >
                <div
                  aria-hidden="true"
                  class="c7 c8"
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
                  class="c9 c10 c11"
                >
                  Add Entry
                </span>
              </a>
            </div>
            <p
              class="c12 c13"
            >
              List of generated tokens to consume the API
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
              aria-hidden="true"
              class="c17 c18"
            >
              <svg
                fill="none"
                height="1em"
                viewBox="0 0 216 120"
                width="10rem"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clip-rule="evenodd"
                  d="M184 23.75a7 7 0 110 14h-40a7 7 0 110 14h22a7 7 0 110 14h-10.174c-4.874 0-8.826 3.134-8.826 7 0 2.577 2 4.91 6 7a7 7 0 110 14H70a7 7 0 110-14H31a7 7 0 110-14h40a7 7 0 100-14H46a7 7 0 110-14h40a7 7 0 110-14h98zm0 28a7 7 0 110 14 7 7 0 010-14z"
                  fill="#DBDBFA"
                  fill-rule="evenodd"
                />
                <path
                  clip-rule="evenodd"
                  d="M130.672 22.75l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61zm-54.83 6.17l4.587-.515-4.587.515z"
                  fill="#fff"
                  fill-rule="evenodd"
                />
                <path
                  d="M75.842 28.92l4.587-.515m50.243-5.655l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61z"
                  stroke="#7E7BF6"
                  stroke-width="2.5"
                />
                <path
                  clip-rule="evenodd"
                  d="M128.14 27.02l8.42 61.483.757 6.168c.244 1.987-1.15 3.793-3.113 4.035l-52.443 6.439c-1.963.241-3.753-1.175-3.997-3.162l-8.15-66.376a2 2 0 011.742-2.23l6.487-.796"
                  fill="#F0F0FF"
                  fill-rule="evenodd"
                />
                <path
                  clip-rule="evenodd"
                  d="M133.229 10H87.672c-.76 0-1.447.308-1.945.806a2.741 2.741 0 00-.805 1.944v76c0 .76.308 1.447.805 1.945a2.741 2.741 0 001.945.805h59a2.74 2.74 0 001.944-.805 2.74 2.74 0 00.806-1.945V26.185c0-.73-.29-1.43-.806-1.945l-13.443-13.435a2.75 2.75 0 00-1.944-.805z"
                  fill="#fff"
                  fill-rule="evenodd"
                  stroke="#7F7CFA"
                  stroke-width="2.5"
                />
                <path
                  d="M133.672 11.153V22.75a3 3 0 003 3h7.933"
                  stroke="#807EFA"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                />
                <path
                  d="M95.672 76.75h26m-26-51h26-26zm0 12h43-43zm0 13h43-43zm0 13h43-43z"
                  stroke="#817FFA"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                />
              </svg>
            </div>
            <div
              class="c19"
            >
              <p
                class="c20"
              >
                Add your first API Token
              </p>
            </div>
            <button
              aria-disabled="false"
              class="c21 c22"
              type="button"
            >
              <div
                aria-hidden="true"
                class="c23 c24 c25"
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
                class="c26 c27"
              >
                Add new API Token
              </span>
            </button>
          </div>
        </div>
      </main>
    `);
  });

  it('should show a list of api tokens', async () => {
    const history = createMemoryHistory();
    history.push('/settings/api-tokens');
    const app = makeApp(history);

    const { getByText } = render(app);

    await waitFor(() => {
      expect(getByText('My super token')).toBeInTheDocument();
      expect(getByText('This describe my super token')).toBeInTheDocument();
    });
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canCreate: false, canDelete: true, canRead: true, canUpdate: true },
    }));

    const history = createMemoryHistory();
    const app = makeApp(history);

    const { queryByTestId } = render(app);

    await waitFor(() => expect(queryByTestId('create-api-token-button')).not.toBeInTheDocument());
  });
});
