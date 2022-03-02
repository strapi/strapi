import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { useGuidedTour } from '@strapi/helper-plugin';
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
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <Router history={history}>
        <GuidedTourHomepage />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('GuidedTour Homepage', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #ffffff;
        padding-top: 32px;
        padding-right: 16px;
        padding-bottom: 16px;
        padding-left: 32px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c4 {
        margin-right: 20px;
        min-width: 1.875rem;
      }

      .c11 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 5.3125rem;
      }

      .c12 {
        margin-top: 8px;
      }

      .c21 {
        background: #c0c0cf;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 4.0625rem;
      }

      .c26 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c23 {
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

      .c23 svg {
        height: 12px;
        width: 12px;
      }

      .c23 svg > g,
      .c23 svg path {
        fill: #ffffff;
      }

      .c23[aria-disabled='true'] {
        pointer-events: none;
      }

      .c23:after {
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

      .c23:focus-visible {
        outline: none;
      }

      .c23:focus-visible:after {
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
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c24 .sc-hKwDye {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c24 .c25 {
        color: #ffffff;
      }

      .c24[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c24[aria-disabled='true'] .c25 {
        color: #666687;
      }

      .c24[aria-disabled='true'] svg > g,
      .c24[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c24[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c24[aria-disabled='true']:active .c25 {
        color: #666687;
      }

      .c24[aria-disabled='true']:active svg > g,
      .c24[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c24:hover {
        background-color: #f6f6f9;
      }

      .c24:active {
        background-color: #eaeaef;
      }

      .c24 .c25 {
        color: #32324d;
      }

      .c24 svg > g,
      .c24 svg path {
        fill: #32324d;
      }

      .c5 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c10 {
        margin-right: 20px;
        margin-top: 12px;
        margin-bottom: 12px;
        min-width: 1.875rem;
      }

      .c19 {
        padding: 8px;
        border-radius: 50%;
        border-style: solid;
        border-width: 1px;
        border-color: #8e8ea9;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c3 {
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

      .c6 {
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

      .c9 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c22 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c1 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c1 > * + * {
        margin-top: 24px;
      }

      .c2 {
        color: #32324d;
        font-weight: 600;
        font-size: 1.125rem;
        line-height: 1.22;
      }

      .c7 {
        font-weight: 500;
        color: #ffffff;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c8 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c20 {
        font-weight: 500;
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c16 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c18 {
        padding-left: 8px;
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

      .c14 {
        padding: 8px 16px;
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

      .c14 .c17 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c14 .c15 {
        color: #ffffff;
      }

      .c14[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true'] .c15 {
        color: #666687;
      }

      .c14[aria-disabled='true'] svg > g,
      .c14[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c14[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c14[aria-disabled='true']:active .c15 {
        color: #666687;
      }

      .c14[aria-disabled='true']:active svg > g,
      .c14[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c14:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c14:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      <div
        class="c0"
      >
        <div
          class="c1"
        >
          <h2
            class="c2"
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
                class="c3"
              >
                <div
                  class="c4"
                >
                  <div
                    class="c5 c6"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c7"
                    >
                      1
                    </span>
                  </div>
                </div>
                <h3
                  class="c8"
                >
                  🧠 Build the content structure
                </h3>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10 c6"
                >
                  <div
                    class="c11"
                    height="100%"
                    width="0.125rem"
                  />
                </div>
                <div
                  class="c12"
                >
                  <a
                    aria-disabled="false"
                    class="c13 c14"
                    href="/plugins/content-type-builder"
                    variant="default"
                  >
                    <span
                      class="c15 c16"
                    >
                      Go to the Content type Builder
                    </span>
                    <div
                      aria-hidden="true"
                      class="c17 c18"
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
              class=""
            >
              <div
                class="c3"
              >
                <div
                  class="c4"
                >
                  <div
                    class="c19 c6"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c20"
                    >
                      2
                    </span>
                  </div>
                </div>
                <h3
                  class="c8"
                >
                  ⚡️ What would you like to share with the world?
                </h3>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10 c6"
                >
                  <div
                    class="c21"
                    height="100%"
                    width="0.125rem"
                  />
                </div>
                <div
                  class="c12"
                />
              </div>
            </div>
            <div
              class=""
            >
              <div
                class="c3"
              >
                <div
                  class="c4"
                >
                  <div
                    class="c19 c6"
                    height="1.875rem"
                    width="1.875rem"
                  >
                    <span
                      class="c20"
                    >
                      3
                    </span>
                  </div>
                </div>
                <h3
                  class="c8"
                >
                  🚀 See content in action
                </h3>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10 c6"
                />
                <div
                  class="c12"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          class="c22"
        >
          <button
            aria-disabled="false"
            class="c23 c24"
            type="button"
          >
            <span
              class="c25 c26"
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
