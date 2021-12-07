import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useAppInfos } from '@strapi/helper-plugin';
import ApplicationInfosPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useAppInfos: jest.fn(),
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
      .c10 {
        background: #ffffff;
        padding-top: 32px;
        padding-right: 24px;
        padding-bottom: 32px;
        padding-left: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c22 {
        padding-top: 4px;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c11 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c11 > * + * {
        margin-top: 20px;
      }

      .c12 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c16 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c17 {
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

      .c13 {
        padding-top: 4px;
      }

      .c14 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c15 {
        grid-column: span 6;
      }

      .c19 {
        color: #4945ff;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c20 {
        padding-left: 8px;
      }

      .c18 {
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-transform: uppercase;
        -webkit-text-decoration: none;
        text-decoration: none;
        position: relative;
        outline: none;
      }

      .c18 svg path {
        fill: #4945ff;
      }

      .c18 svg {
        font-size: 0.625rem;
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

      .c21 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      @media (max-width:68.75rem) {
        .c15 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c15 {
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
              >
                <div
                  class="c11"
                >
                  <h3
                    class="c12"
                  >
                    Details
                  </h3>
                  <div
                    class="c13 c14"
                  >
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <span
                          class="c16"
                        >
                          strapi version
                        </span>
                        <p
                          class="c17"
                        >
                          v
                          4.0.0
                        </p>
                        <a
                          class="c18"
                          href="https://support.strapi.io/support/home"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c19"
                          >
                            Get help
                          </span>
                          <span
                            aria-hidden="true"
                            class="c20 c21"
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
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <span
                          class="c16"
                        >
                          current plan
                        </span>
                        <p
                          class="c17"
                        >
                          Enterprise Edition
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    class="c13 c14"
                  >
                    <div
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <a
                          class="c18"
                          href="https://github.com/strapi/strapi/releases/tag/v3.6.8"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c19"
                          >
                            Upgrade your admin panel
                          </span>
                          <span
                            aria-hidden="true"
                            class="c20 c21"
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
                      class="c15"
                    >
                      <div
                        class=""
                      >
                        <a
                          class="c18"
                          href="https://strapi.io/pricing-self-hosted"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          <span
                            class="c19"
                          >
                            See all pricing plans
                          </span>
                          <span
                            aria-hidden="true"
                            class="c20 c21"
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
                    class="c22"
                  >
                    <span
                      class="c16"
                    >
                      node version
                    </span>
                    <p
                      class="c17"
                    />
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
