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
      .c3 {
        font-weight: 600;
        font-size: 1.125rem;
        line-height: 1.22;
        color: #32324d;
      }

      .c8 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c9 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c22 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #666687;
      }

      .c29 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 0;
        color: #ffffff;
      }

      .c0 {
        background: #ffffff;
        padding-top: 32px;
        padding-right: 16px;
        padding-bottom: 16px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c5 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c6 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c11 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c12 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 5.3125rem;
      }

      .c13 {
        margin-top: 8px;
      }

      .c21 {
        padding: 8px;
        border-radius: 50%;
        border-style: solid;
        border-width: 1px;
        border-color: #8e8ea9;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c23 {
        background: #c0c0cf;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c25 {
        background: #4945ff;
        padding: 8px;
        padding-right: 16px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
        cursor: pointer;
      }

      .c1 {
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
        gap: 24px;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
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
      }

      .c24 {
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

      .c26 {
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

      .c27 {
        position: relative;
        outline: none;
      }

      .c27 > svg {
        height: 12px;
        width: 12px;
      }

      .c27 > svg > g,
      .c27 > svg path {
        fill: #ffffff;
      }

      .c27[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27:after {
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

      .c27:focus-visible {
        outline: none;
      }

      .c27:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c28 {
        height: 2rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c28[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true'] .c2 {
        color: #666687;
      }

      .c28[aria-disabled='true'] svg > g,.c28[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c28[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true']:active .c2 {
        color: #666687;
      }

      .c28[aria-disabled='true']:active svg > g,.c28[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c28:hover {
        background-color: #f6f6f9;
      }

      .c28:active {
        background-color: #eaeaef;
      }

      .c28 .c2 {
        color: #32324d;
      }

      .c28 svg > g,
      .c28 svg path {
        fill: #32324d;
      }

      .c14 {
        background: #4945ff;
        padding-top: 8px;
        padding-right: 16px;
        padding-bottom: 8px;
        padding-left: 16px;
        border-radius: 4px;
        border-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c19 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c15 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        gap: 8px;
      }

      .c20 {
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

      .c16 {
        position: relative;
        outline: none;
      }

      .c16 > svg {
        height: 12px;
        width: 12px;
      }

      .c16 > svg > g,
      .c16 > svg path {
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

      .c17 {
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c17[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c17[aria-disabled='true'] .c18 {
        color: #666687;
      }

      .c17[aria-disabled='true'] svg > g,.c17[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c17[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c17[aria-disabled='true']:active .c18 {
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
        class="c0"
      >
        <div
          class="c1"
        >
          <h2
            class="c2 c3"
          >
            3 steps to get started
          </h2>
          <div
            class=""
          >
            <div
              class=""
            >
              <div
                class="c4"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c6 c7"
                  >
                    <span
                      class="c2 c8"
                    >
                      1
                    </span>
                  </div>
                </div>
                <h3
                  class="c2 c9"
                >
                  🧠 Build the content structure
                </h3>
              </div>
              <div
                class="c10"
              >
                <div
                  class="c11 c7"
                >
                  <div
                    class="c12"
                  />
                </div>
                <div
                  class="c13"
                >
                  <a
                    aria-disabled="false"
                    class="c14 c15 c16 c17"
                    href="/plugins/content-type-builder"
                  >
                    <span
                      class="c18 c19"
                    >
                      Go to the Content type Builder
                    </span>
                    <div
                      aria-hidden="true"
                      class="c20"
                    >
                      <svg
                        fill="none"
                        height="1rem"
                        viewBox="0 0 24 24"
                        width="1rem"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10.7c0-.11.09-.2.2-.2h18.06l-8.239-8.239a.2.2 0 0 1 0-.282L11.86.14a.2.2 0 0 1 .282 0L23.86 11.86a.2.2 0 0 1 0 .282L12.14 23.86a.2.2 0 0 1-.282 0L10.02 22.02a.2.2 0 0 1 0-.282L18.26 13.5H.2a.2.2 0 0 1-.2-.2v-2.6Z"
                          fill="#212134"
                        />
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <div
              class=""
            >
              <div
                class="c4"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c21 c7"
                  >
                    <span
                      class="c2 c22"
                    >
                      2
                    </span>
                  </div>
                </div>
                <h3
                  class="c2 c9"
                >
                  ⚡️ What would you like to share with the world?
                </h3>
              </div>
              <div
                class="c10"
              >
                <div
                  class="c11 c7"
                >
                  <div
                    class="c23"
                  />
                </div>
                <div
                  class="c13"
                />
              </div>
            </div>
            <div
              class=""
            >
              <div
                class="c4"
              >
                <div
                  class="c5"
                >
                  <div
                    class="c21 c7"
                  >
                    <span
                      class="c2 c22"
                    >
                      3
                    </span>
                  </div>
                </div>
                <h3
                  class="c2 c9"
                >
                  🚀 See content in action
                </h3>
              </div>
              <div
                class="c10"
              >
                <div
                  class="c11 c7"
                />
                <div
                  class="c13"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          class="c24"
        >
          <button
            aria-disabled="false"
            class="c25 c26 c27 c28"
            type="button"
          >
            <span
              class="c2 c29"
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
