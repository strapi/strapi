import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useAppInfos } from '@strapi/helper-plugin';
import ApplicationInfosPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
  useAppInfos: jest.fn(),
}));
jest.mock('../../../../../hooks/useConfigurations', () => () => ({
  logos: {
    menu: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ApplicationInfosPage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Application page', () => {
  it('renders and matches the snapshot', () => {
    useAppInfos.mockImplementationOnce(() => {
      return {
        shouldUpdateStrapi: true,
        latestStrapiReleaseTag: 'v3.6.8',
        strapiVersion: '4.0.0',
      };
    });

    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c11 {
        background: #ffffff;
        padding-top: 32px;
        padding-right: 24px;
        padding-bottom: 32px;
        padding-left: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c23 {
        padding-top: 4px;
      }

      .c35 {
        max-width: 40%;
        max-height: 40%;
      }

      .c38 {
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

      .c38 svg {
        height: 12px;
        width: 12px;
      }

      .c38 svg > g,
      .c38 svg path {
        fill: #ffffff;
      }

      .c38[aria-disabled='true'] {
        pointer-events: none;
      }

      .c38:after {
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

      .c38:focus-visible {
        outline: none;
      }

      .c38:focus-visible:after {
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

      .c39 svg > g,
      .c39 svg path {
        fill: #8e8ea9;
      }

      .c39:hover svg > g,
      .c39:hover svg path {
        fill: #666687;
      }

      .c39:active svg > g,
      .c39:active svg path {
        fill: #a5a5ba;
      }

      .c39[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c39[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c10 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c10 > * + * {
        margin-top: 24px;
      }

      .c12 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c12 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c12 > * + * {
        margin-top: 20px;
      }

      .c13 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c17 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c18 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c1 {
        padding-bottom: 56px;
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 40px;
        padding-right: 56px;
        padding-bottom: 40px;
        padding-left: 56px;
      }

      .c9 {
        padding-right: 56px;
        padding-left: 56px;
      }

      .c0 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c2 {
        overflow-x: hidden;
      }

      .c5 {
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

      .c6 {
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

      .c7 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c8 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c14 {
        padding-top: 4px;
      }

      .c15 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c16 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c20 {
        color: #4945ff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c21 {
        padding-left: 8px;
      }

      .c19 {
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

      .c19 svg path {
        fill: #4945ff;
      }

      .c19 svg {
        font-size: 0.625rem;
      }

      .c19:after {
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

      .c19:focus-visible {
        outline: none;
      }

      .c19:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c22 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      .c27 {
        background: #f6f6f9;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
      }

      .c28 {
        position: relative;
      }

      .c30 {
        padding-right: 8px;
        padding-left: 8px;
        width: 100%;
      }

      .c32 {
        height: 124px;
      }

      .c36 {
        position: absolute;
        bottom: 4px;
        width: 100%;
      }

      .c40 {
        padding-top: 8px;
        padding-right: 16px;
        padding-left: 16px;
      }

      .c25 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c41 {
        color: #666687;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c42 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c26 {
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

      .c33 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c29 {
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-areas: 'startAction slides endAction';
      }

      .c31 {
        grid-area: slides;
      }

      .c24 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c24 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c24 > * + * {
        margin-top: 4px;
      }

      .c37 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c37 > * + * {
        margin-left: 4px;
      }

      .c34 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      @media (max-width:68.75rem) {
        .c16 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c16 {
          grid-column: span;
        }
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-labelledby="main-content-title"
            class="c3"
            id="main-content"
            tabindex="-1"
          >
            <div
              style="height: 0px;"
            >
              <div
                class="c4"
                data-strapi-header="true"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c6"
                  >
                    <h1
                      class="c7"
                    >
                      Overview
                    </h1>
                  </div>
                </div>
                <p
                  class="c8"
                >
                  Administration panel’s global information
                </p>
              </div>
            </div>
            <div
              class="c9"
            >
              <div
                class="c10"
                spacing="6"
              >
                <div
                  class="c11"
                >
                  <div
                    class="c12"
                    spacing="5"
                  >
                    <h3
                      class="c13"
                    >
                      Details
                    </h3>
                    <div
                      class="c14 c15"
                    >
                      <div
                        class="c16"
                      >
                        <div
                          class=""
                        >
                          <span
                            class="c17"
                          >
                            strapi version
                          </span>
                          <p
                            class="c18"
                          >
                            v
                            4.0.0
                          </p>
                          <a
                            class="c19"
                            href="https://support.strapi.io/support/home"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c20"
                            >
                              Get help
                            </span>
                            <span
                              aria-hidden="true"
                              class="c21 c22"
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
                        class="c16"
                      >
                        <div
                          class=""
                        >
                          <span
                            class="c17"
                          >
                            current plan
                          </span>
                          <p
                            class="c18"
                          >
                            Enterprise Edition
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      class="c14 c15"
                    >
                      <div
                        class="c16"
                      >
                        <div
                          class=""
                        >
                          <a
                            class="c19"
                            href="https://github.com/strapi/strapi/releases/tag/v3.6.8"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c20"
                            >
                              Upgrade your admin panel
                            </span>
                            <span
                              aria-hidden="true"
                              class="c21 c22"
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
                        class="c16"
                      >
                        <div
                          class=""
                        >
                          <a
                            class="c19"
                            href="https://strapi.io/pricing-self-hosted"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c20"
                            >
                              See all pricing plans
                            </span>
                            <span
                              aria-hidden="true"
                              class="c21 c22"
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
                      class="c23"
                    >
                      <span
                        class="c17"
                      >
                        node version
                      </span>
                      <p
                        class="c18"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    class="c11"
                  >
                    <div
                      class="c12"
                      spacing="5"
                    >
                      <h3
                        class="c13"
                      >
                        Customization
                      </h3>
                      <div
                        class="c15"
                      >
                        <div
                          class="c16"
                        >
                          <div
                            class=""
                          >
                            <div>
                              <div
                                class="c24"
                                spacing="1"
                              >
                                <label
                                  class="c25"
                                  for="carouselinput-1"
                                >
                                  <div
                                    class="c26"
                                  >
                                    Logo
                                  </div>
                                </label>
                                <div
                                  class=""
                                  id="carouselinput-1"
                                >
                                  <div
                                    class="c27"
                                  >
                                    <section
                                      aria-label="Logo"
                                      aria-roledescription="carousel"
                                      class="c28 c29"
                                    >
                                      <div
                                        aria-live="polite"
                                        class="c30 c31"
                                        width="100%"
                                      >
                                        <div
                                          aria-label="logo slide"
                                          aria-roledescription="slide"
                                          class="c32 c33 c34"
                                          height="124px"
                                          role="group"
                                        >
                                          <img
                                            alt="Logo"
                                            class="c35"
                                            src="IMAGE_MOCK"
                                          />
                                        </div>
                                      </div>
                                      <div
                                        class="c36 c33 c37"
                                        spacing="1"
                                        width="100%"
                                      >
                                        <span>
                                          <button
                                            aria-disabled="false"
                                            aria-labelledby="tooltip-1"
                                            class="c38 c39"
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
                                      </div>
                                    </section>
                                    <div
                                      class="c40"
                                    >
                                      <span>
                                        <div
                                          aria-labelledby="tooltip-2"
                                          class="c33"
                                          tabindex="0"
                                        >
                                          <span
                                            class="c41"
                                          >
                                            cat-logo.png
                                          </span>
                                        </div>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <p
                                  class="c42"
                                  id="carouselinput-1-hint"
                                >
                                  Change the admin panel logo (Max dimension: 750*750, Max file size: TBC)
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
            </div>
          </main>
        </div>
      </div>
    `);
  });

  it('should display latest version and link upgrade version', () => {
    useAppInfos.mockImplementationOnce(() => {
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
    useAppInfos.mockImplementationOnce(() => {
      return {
        shouldUpdateStrapi: false,
        latestStrapiReleaseTag: 'v3.6.8',
      };
    });

    const { queryByText } = render(App);

    expect(queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });
});
