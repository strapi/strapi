import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { useGuidedTour, TrackingProvider } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import GuidedTourHomepage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useGuidedTour: jest.fn(() => ({
    isGuidedTourVisible: false,
    guidedTourState: {
      apiTokens: {
        create: false,
        success: false,
      },
      contentManager: {
        create: false,
        success: false,
      },
      contentTypeBuilder: {
        create: false,
        success: false,
      },
    },
  })),
}));

const history = createMemoryHistory();

const App = (
  <TrackingProvider>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <Router history={history}>
          <GuidedTourHomepage />
        </Router>
      </IntlProvider>
    </ThemeProvider>
  </TrackingProvider>
);

describe('GuidedTour Homepage', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        background: #ffffff;
        padding-top: 32px;
        padding-right: 16px;
        padding-bottom: 16px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c7 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c8 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c13 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c14 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 5.3125rem;
      }

      .c15 {
        margin-top: 8px;
      }

      .c19 {
        padding-left: 8px;
      }

      .c20 {
        padding: 8px;
        border-radius: 50%;
        border-style: solid;
        border-width: 1px;
        border-color: #8e8ea9;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c22 {
        background: #c0c0cf;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c2 {
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

      .c12 {
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
      }

      .c23 {
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
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
      }

      .c5 {
        font-weight: 600;
        font-size: 1.125rem;
        line-height: 1.22;
        color: #32324d;
      }

      .c10 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c11 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c18 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c21 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #666687;
      }

      .c25 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c3 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c3 > * + * {
        margin-top: 24px;
      }

      .c16 {
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

      .c16 svg {
        height: 12px;
        width: 12px;
      }

      .c16 svg > g,
      .c16 svg path {
        fill: #ffffff;
      }

      .c16[aria-disabled='true'] {
        pointer-events: none;
      }

      .c16:after {
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

      .c16:focus-visible {
        outline: none;
      }

      .c16:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c24 {
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

      .c24 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c24 .c4 {
        color: #ffffff;
      }

      .c24[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c24[aria-disabled='true'] .c4 {
        color: #666687;
      }

      .c24[aria-disabled='true'] svg > g,.c24[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c24[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c24[aria-disabled='true']:active .c4 {
        color: #666687;
      }

      .c24[aria-disabled='true']:active svg > g,.c24[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c24:hover {
        background-color: #f6f6f9;
      }

      .c24:active {
        background-color: #eaeaef;
      }

      .c24 .c4 {
        color: #32324d;
      }

      .c24 svg > g,
      .c24 svg path {
        fill: #32324d;
      }

      .c17 {
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
        border-radius: 4px;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c17 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c17 .c4 {
        color: #ffffff;
      }

      .c17[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c17[aria-disabled='true'] .c4 {
        color: #666687;
      }

      .c17[aria-disabled='true'] svg > g,.c17[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c17[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c17[aria-disabled='true']:active .c4 {
        color: #666687;
      }

      .c17[aria-disabled='true']:active svg > g,.c17[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c17:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c17:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c17 svg > g,
      .c17 svg path {
        fill: #ffffff;
      }

      <div
        class="c0 c1"
      >
        <div
          class="c0 c2 c3"
          spacing="6"
        >
          <h2
            class="c4 c5"
          >
            3 steps to get started
          </h2>
          <div
            class="c0 "
          >
            <div
              class="c0 "
            >
              <div
                class="c0 c6"
              >
                <div
                  class="c0 c7"
                >
                  <div
                    class="c0 c8 c9"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c4 c10"
                    >
                      1
                    </span>
                  </div>
                </div>
                <h3
                  class="c4 c11"
                >
                  🧠 Build the content structure
                </h3>
              </div>
              <div
                class="c0 c12"
              >
                <div
                  class="c0 c13 c9"
                >
                  <div
                    class="c0 c14"
                    height="100%"
                    width="0.125rem"
                  />
                </div>
                <div
                  class="c0 c15"
                >
                  <a
                    aria-disabled="false"
                    class="c16 c17"
                    href="/plugins/content-type-builder"
                    variant="default"
                  >
                    <span
                      class="c4 c18"
                    >
                      Go to the Content type Builder
                    </span>
                    <div
                      aria-hidden="true"
                      class="c0 c19"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10.7c0-.11.09-.2.2-.2h18.06l-8.239-8.239a.2.2 0 010-.282L11.86.14a.2.2 0 01.282 0L23.86 11.86a.2.2 0 010 .282L12.14 23.86a.2.2 0 01-.282 0L10.02 22.02a.2.2 0 010-.282L18.26 13.5H.2a.2.2 0 01-.2-.2v-2.6z"
                          fill="#212134"
                        />
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <div
              class="c0 "
            >
              <div
                class="c0 c6"
              >
                <div
                  class="c0 c7"
                >
                  <div
                    class="c0 c20 c9"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c4 c21"
                    >
                      2
                    </span>
                  </div>
                </div>
                <h3
                  class="c4 c11"
                >
                  ⚡️ What would you like to share with the world?
                </h3>
              </div>
              <div
                class="c0 c12"
              >
                <div
                  class="c0 c13 c9"
                >
                  <div
                    class="c0 c22"
                    height="100%"
                    width="0.125rem"
                  />
                </div>
                <div
                  class="c0 c15"
                />
              </div>
            </div>
            <div
              class="c0 "
            >
              <div
                class="c0 c6"
              >
                <div
                  class="c0 c7"
                >
                  <div
                    class="c0 c20 c9"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c4 c21"
                    >
                      3
                    </span>
                  </div>
                </div>
                <h3
                  class="c4 c11"
                >
                  🚀 See content in action
                </h3>
              </div>
              <div
                class="c0 c12"
              >
                <div
                  class="c0 c13 c9"
                />
                <div
                  class="c0 c15"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          class="c0 c23"
        >
          <button
            aria-disabled="false"
            class="c16 c24"
            type="button"
          >
            <span
              class="c4 c25"
            >
              Skip the tour
            </span>
          </button>
        </div>
      </div>
    `);
  });

  it('should show guided tour when guided tour not complete', () => {
    useGuidedTour.mockImplementation(() => ({
      isGuidedTourVisible: true,
      guidedTourState: {
        apiTokens: {
          create: false,
          success: false,
        },
        contentManager: {
          create: false,
          success: false,
        },
        contentTypeBuilder: {
          create: false,
          success: false,
        },
      },
    }));

    render(App);

    expect(screen.getByText('🧠 Build the content structure')).toBeInTheDocument();
  });

  it("shouldn't show guided tour when guided tour is completed", () => {
    useGuidedTour.mockImplementation(() => ({
      isGuidedTourVisible: true,
      guidedTourState: {
        apiTokens: {
          create: true,
          success: true,
        },
        contentManager: {
          create: true,
          success: true,
        },
        contentTypeBuilder: {
          create: true,
          success: true,
        },
      },
    }));

    const { queryByText } = render(App);

    expect(queryByText('Build the content structure')).not.toBeInTheDocument();
  });

  it("shouldn't show guided tour when guided tour is skipped", () => {
    useGuidedTour.mockImplementation(() => ({
      isSkipped: true,
      isGuidedTourVisible: true,
      guidedTourState: {
        apiTokens: {
          create: false,
          success: false,
        },
        contentManager: {
          create: false,
          success: false,
        },
        contentTypeBuilder: {
          create: false,
          success: false,
        },
      },
    }));

    const { queryByText } = render(App);

    expect(queryByText('Build the content structure')).not.toBeInTheDocument();
  });
});
