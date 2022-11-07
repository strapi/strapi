import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useAppInfos, TrackingProvider } from '@strapi/helper-plugin';
import ApplicationInfosPage from '../index';
import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfos: jest.fn(),
  useNotification: jest.fn(),
}));
jest.mock('../../../../../hooks/useConfigurations', () => () => ({
  logos: {
    menu: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
}));

const client = new QueryClient();

const App = (
  <QueryClientProvider client={client}>
    <TrackingProvider>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} textComponent="span">
          <ApplicationInfosPage />
        </IntlProvider>
      </ThemeProvider>
    </TrackingProvider>
  </QueryClientProvider>
);

describe('Application page', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    useAppInfos.mockImplementation(() => {
      return {
        shouldUpdateStrapi: true,
        latestStrapiReleaseTag: 'v3.6.8',
        strapiVersion: '4.0.0',
      };
    });

    const {
      container: { firstChild },
    } = render(App);

    await waitFor(() => expect(screen.getByText('Logo')).toBeInTheDocument());

    expect(firstChild).toMatchInlineSnapshot(`
      .c2 {
        padding-bottom: 56px;
      }

      .c5 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c12 {
        padding-right: 8px;
      }

      .c16 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c19 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 32px;
        padding-bottom: 24px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c22 {
        padding-top: 4px;
      }

      .c30 {
        padding-left: 8px;
      }

      .c32 {
        padding-top: 16px;
      }

      .c34 {
        background: #f6f6f9;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
      }

      .c35 {
        position: relative;
      }

      .c37 {
        padding-right: 8px;
        padding-left: 8px;
        overflow: hidden;
        width: 100%;
      }

      .c39 {
        height: 124px;
      }

      .c42 {
        max-width: 40%;
        max-height: 40%;
      }

      .c43 {
        position: absolute;
        bottom: 4px;
        width: 100%;
      }

      .c46 {
        padding-top: 8px;
        padding-right: 16px;
        padding-left: 16px;
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
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
      }

      .c17 {
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

      .c40 {
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

      .c9 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c14 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c15 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c21 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c25 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c26 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c29 {
        color: #4945ff;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c47 {
        color: #666687;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c48 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c18 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c18 > * + * {
        margin-top: 24px;
      }

      .c20 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c20 > * + * {
        margin-top: 20px;
      }

      .c33 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c33 > * + * {
        margin-top: 4px;
      }

      .c44 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c44 > * + * {
        margin-left: 4px;
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

      .c13 {
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

      .c11 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c11 .c8 {
        color: #ffffff;
      }

      .c11[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c11[aria-disabled='true'] .c8 {
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

      .c11[aria-disabled='true']:active .c8 {
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

      .c45 {
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

      .c45 svg > g,
      .c45 svg path {
        fill: #8e8ea9;
      }

      .c45:hover svg > g,
      .c45:hover svg path {
        fill: #666687;
      }

      .c45:active svg > g,
      .c45:active svg path {
        fill: #a5a5ba;
      }

      .c45[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c45[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c27 {
        cursor: pointer;
      }

      .c28 {
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

      .c28 svg path {
        fill: #4945ff;
      }

      .c28 svg {
        font-size: 0.625rem;
      }

      .c28:after {
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

      .c28:focus-visible {
        outline: none;
      }

      .c28:focus-visible:after {
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
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      .c1 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c3 {
        overflow-x: hidden;
      }

      .c23 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c24 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c4:focus-visible {
        outline: none;
      }

      .c36 {
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-areas: 'startAction slides endAction';
      }

      .c38 {
        grid-area: slides;
      }

      .c41 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      @media (max-width:68.75rem) {
        .c24 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c24 {
          grid-column: span;
        }
      }

      <div
        class="c0 c1"
      >
        <div
          class="c0 c2 c3"
        >
          <main
            aria-labelledby="main-content-title"
            class="c4"
            id="main-content"
            tabindex="-1"
          >
            <div
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
                      class="c8 c9"
                    >
                      Overview
                    </h1>
                  </div>
                  <button
                    aria-disabled="false"
                    class="c10 c11"
                    type="button"
                  >
                    <div
                      aria-hidden="true"
                      class="c0 c12 c13"
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
                      class="c8 c14"
                    >
                      Save
                    </span>
                  </button>
                </div>
                <p
                  class="c8 c15"
                >
                  Administration panel’s global information
                </p>
              </div>
            </div>
            <div
              class="c0 c16"
            >
              <div
                class="c0 c17 c18"
                spacing="6"
              >
                <div
                  class="c0 c19"
                >
                  <div
                    class="c0 c17 c20"
                    spacing="5"
                  >
                    <h3
                      class="c8 c21"
                    >
                      Details
                    </h3>
                    <div
                      class="c0 c22 c23"
                    >
                      <div
                        class="c24"
                      >
                        <div
                          class="c0 "
                        >
                          <span
                            class="c8 c25"
                          >
                            strapi version
                          </span>
                          <p
                            class="c8 c26"
                          >
                            v
                            4.0.0
                          </p>
                          <a
                            class="c27 c28"
                            href="https://support.strapi.io/support/home"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c8 c29"
                            >
                              Get help
                            </span>
                            <span
                              aria-hidden="true"
                              class="c0 c30 c31"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                  fill="#32324D"
                                />
                              </svg>
                            </span>
                          </a>
                        </div>
                      </div>
                      <div
                        class="c24"
                      >
                        <div
                          class="c0 "
                        >
                          <span
                            class="c8 c25"
                          >
                            current plan
                          </span>
                          <p
                            class="c8 c26"
                          >
                            Enterprise Edition
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c0 c22 c23"
                    >
                      <div
                        class="c24"
                      >
                        <div
                          class="c0 "
                        >
                          <a
                            class="c27 c28"
                            href="https://github.com/strapi/strapi/releases/tag/v3.6.8"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c8 c29"
                            >
                              Upgrade your admin panel
                            </span>
                            <span
                              aria-hidden="true"
                              class="c0 c30 c31"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                  fill="#32324D"
                                />
                              </svg>
                            </span>
                          </a>
                        </div>
                      </div>
                      <div
                        class="c24"
                      >
                        <div
                          class="c0 "
                        >
                          <a
                            class="c27 c28"
                            href="https://strapi.io/pricing-self-hosted"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c8 c29"
                            >
                              See all pricing plans
                            </span>
                            <span
                              aria-hidden="true"
                              class="c0 c30 c31"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                  fill="#32324D"
                                />
                              </svg>
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c0 c22"
                    >
                      <span
                        class="c8 c25"
                      >
                        node version
                      </span>
                      <p
                        class="c8 c26"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    class="c0 c19"
                  >
                    <h3
                      class="c8 c21"
                    >
                      Customization
                    </h3>
                    <div
                      class="c0 c32 c23"
                    >
                      <div
                        class="c24"
                      >
                        <div
                          class="c0 "
                        >
                          <div>
                            <div
                              class="c0 c17 c33"
                              spacing="1"
                            >
                              <label
                                class="c8 c14"
                                for="carouselinput-1"
                              >
                                <div
                                  class="c0 c7"
                                >
                                  Logo
                                </div>
                              </label>
                              <div
                                class="c0 "
                                id="carouselinput-1"
                              >
                                <div
                                  class="c0 c34"
                                >
                                  <section
                                    aria-label="Logo"
                                    aria-roledescription="carousel"
                                    class="c0 c35 c36"
                                  >
                                    <div
                                      aria-live="polite"
                                      class="c0 c37 c38"
                                      overflow="hidden"
                                      width="100%"
                                    >
                                      <div
                                        aria-label="Logo slide"
                                        aria-roledescription="slide"
                                        class="c0 c39 c40 c41"
                                        height="124px"
                                        role="group"
                                      >
                                        <img
                                          alt="Logo"
                                          class="c0 c42"
                                          src="http://localhost:1337/uploads/michka.svg"
                                        />
                                      </div>
                                    </div>
                                    <div
                                      class="c0 c43 c40 c44"
                                      spacing="1"
                                      width="100%"
                                    >
                                      <span>
                                        <button
                                          aria-disabled="false"
                                          aria-labelledby="tooltip-2"
                                          class="c10 c45"
                                          tabindex="0"
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
                                              d="M24 13.604a.3.3 0 01-.3.3h-9.795V23.7a.3.3 0 01-.3.3h-3.21a.3.3 0 01-.3-.3v-9.795H.3a.3.3 0 01-.3-.3v-3.21a.3.3 0 01.3-.3h9.795V.3a.3.3 0 01.3-.3h3.21a.3.3 0 01.3.3v9.795H23.7a.3.3 0 01.3.3v3.21z"
                                              fill="#212134"
                                            />
                                          </svg>
                                        </button>
                                      </span>
                                      <span>
                                        <button
                                          aria-disabled="false"
                                          aria-labelledby="tooltip-4"
                                          class="c10 c45"
                                          tabindex="0"
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
                                              d="M15.681 2.804A9.64 9.64 0 0011.818 2C6.398 2 2 6.48 2 12c0 5.521 4.397 10 9.818 10 2.03 0 4.011-.641 5.67-1.835a9.987 9.987 0 003.589-4.831 1.117 1.117 0 00-.664-1.418 1.086 1.086 0 00-1.393.676 7.769 7.769 0 01-2.792 3.758 7.546 7.546 0 01-4.41 1.428V4.222h.002a7.492 7.492 0 013.003.625 7.61 7.61 0 012.5 1.762l.464.551-2.986 3.042a.186.186 0 00.129.316H22V3.317a.188.188 0 00-.112-.172.179.179 0 00-.199.04l-2.355 2.4-.394-.468-.02-.02a9.791 9.791 0 00-3.239-2.293zm-3.863 1.418V2v2.222zm0 0v15.556c-4.216 0-7.636-3.484-7.636-7.778s3.42-7.777 7.636-7.778z"
                                              fill="#212134"
                                              fill-rule="evenodd"
                                            />
                                          </svg>
                                        </button>
                                      </span>
                                    </div>
                                  </section>
                                  <div
                                    class="c0 c46"
                                  >
                                    <span>
                                      <div
                                        aria-labelledby="tooltip-6"
                                        class="c0 c40"
                                        tabindex="0"
                                      >
                                        <span
                                          class="c8 c47"
                                        >
                                          michka.svg
                                        </span>
                                      </div>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p
                                class="c8 c48"
                                id="carouselinput-1-hint"
                              >
                                Change the admin panel logo (Max dimension: 750x750, Max file size: 100KB)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });

  it('should display latest version and link upgrade version', () => {
    useAppInfos.mockImplementation(() => {
      return {
        shouldUpdateStrapi: true,
        latestStrapiReleaseTag: 'v3.6.8',
        strapiVersion: '4.0.0',
      };
    });

    render(App);

    expect(screen.getByText('v4.0.0')).toBeInTheDocument();
    expect(screen.getByText('Upgrade your admin panel')).toBeInTheDocument();
  });

  it("shouldn't display link upgrade version if not necessary", () => {
    useAppInfos.mockImplementation(() => {
      return {
        shouldUpdateStrapi: false,
        latestStrapiReleaseTag: 'v3.6.8',
      };
    });

    const { queryByText } = render(App);

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  it('should display', () => {
    useAppInfos.mockImplementation(() => {
      return {
        shouldUpdateStrapi: false,
        latestStrapiReleaseTag: 'v3.6.8',
      };
    });

    const { queryByText } = render(App);

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });
});
