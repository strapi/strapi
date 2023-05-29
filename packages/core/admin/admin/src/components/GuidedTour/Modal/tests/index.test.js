import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useGuidedTour, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../Theme';
import ThemeToggleProvider from '../../../ThemeToggleProvider';
import GuidedTourModal from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useGuidedTour: jest.fn(() => ({
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
    currentStep: 'contentTypeBuilder.create',
  })),
}));

const App = (
  <TrackingProvider>
    <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
      <Theme>
        <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
          <GuidedTourModal />
        </IntlProvider>
      </Theme>
    </ThemeToggleProvider>
  </TrackingProvider>
);

describe('<GuidedTourModal />', () => {
  it('should match the snapshot with contentTypeBuilder.create layout', async () => {
    render(App);

    expect(screen.getByText('🧠 Create a first Collection type')).toBeInTheDocument();

    expect(document.body).toMatchInlineSnapshot(`
      .c1 {
        padding: 40px;
      }

      .c4 {
        background: #ffffff;
        padding: 16px;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
        width: 41.25rem;
      }

      .c7 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c10 {
        padding-right: 32px;
        padding-left: 32px;
      }

      .c12 {
        margin-right: 40px;
        min-width: 1.875rem;
      }

      .c13 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 1.5rem;
      }

      .c17 {
        padding-top: 12px;
        padding-bottom: 12px;
      }

      .c18 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c22 {
        padding-bottom: 24px;
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

      .c15 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #4945ff;
      }

      .c19 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c20 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        font-weight: 600;
        color: #32324d;
      }

      .c24 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c28 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 0;
        color: #ffffff;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c5 {
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
        gap: 40px;
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
        -webkit-box-pack: end;
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
      }

      .c11 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
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
      }

      .c21 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c23 {
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
        gap: 16px;
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

      .c8 {
        position: relative;
        outline: none;
      }

      .c8 > svg {
        height: 12px;
        width: 12px;
      }

      .c8 > svg > g,
      .c8 > svg path {
        fill: #ffffff;
      }

      .c8[aria-disabled='true'] {
        pointer-events: none;
      }

      .c8:after {
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

      .c8:focus-visible {
        outline: none;
      }

      .c8:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c0 {
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

      .c27 {
        height: 2rem;
      }

      .c27[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true'] .c14 {
        color: #666687;
      }

      .c27[aria-disabled='true'] svg > g,.c27[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c27[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true']:active .c14 {
        color: #666687;
      }

      .c27[aria-disabled='true']:active svg > g,.c27[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c27:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c27:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c27 svg > g,
      .c27 svg path {
        fill: #ffffff;
      }

      .c29 {
        height: 2rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c29[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c29[aria-disabled='true'] .c14 {
        color: #666687;
      }

      .c29[aria-disabled='true'] svg > g,.c29[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c29[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c29[aria-disabled='true']:active .c14 {
        color: #666687;
      }

      .c29[aria-disabled='true']:active svg > g,.c29[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c29:hover {
        background-color: #f6f6f9;
      }

      .c29:active {
        background-color: #eaeaef;
      }

      .c29 .c14 {
        color: #32324d;
      }

      .c29 svg > g,
      .c29 svg path {
        fill: #32324d;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #8e8ea9;
      }

      .c9:hover svg > g,
      .c9:hover svg path {
        fill: #666687;
      }

      .c9:active svg > g,
      .c9:active svg path {
        fill: #a5a5ba;
      }

      .c9[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c3 {
        position: fixed;
        z-index: 4;
        inset: 0;
        background: #32324d1F;
      }

      <body>
        <div>
          <div
            class="c0"
          >
            <p
              aria-live="polite"
              aria-relevant="all"
              id="live-region-log"
              role="log"
            />
            <p
              aria-live="polite"
              aria-relevant="all"
              id="live-region-status"
              role="status"
            />
            <p
              aria-live="assertive"
              aria-relevant="all"
              id="live-region-alert"
              role="alert"
            />
          </div>
        </div>
        <div
          class=""
        >
          <div
            class="c1 c2 c3"
          >
            <div>
              <div
                aria-modal="true"
                class="c4 c5"
                role="dialog"
              >
                <div
                  class="c6"
                >
                  <button
                    aria-disabled="false"
                    class="c7 c2 c8 c9"
                    type="button"
                  >
                    <span
                      class="c0"
                    >
                      Close
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
                        d="M24 2.417 21.583 0 12 9.583 2.417 0 0 2.417 9.583 12 0 21.583 2.417 24 12 14.417 21.583 24 24 21.583 14.417 12 24 2.417Z"
                        fill="#212134"
                      />
                    </svg>
                  </button>
                </div>
                <div
                  class="c10"
                >
                  <div
                    class="c11"
                  >
                    <div
                      class="c12 c2"
                    >
                      <div
                        class="c13"
                      />
                    </div>
                    <span
                      class="c14 c15"
                    >
                      3 steps to get started
                    </span>
                  </div>
                  <div
                    class="c16"
                  >
                    <div
                      class="c12 c16"
                    >
                      <div
                        class="c17"
                      >
                        <div
                          class="c18 c2"
                        >
                          <span
                            class="c14 c19"
                          >
                            3
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3
                      class="c14 c20"
                      id="title"
                    >
                      🧠 Create a first Collection type
                    </h3>
                  </div>
                  <div
                    class="c11"
                  >
                    <div
                      class="c12 c21"
                    />
                    <div
                      class=""
                    >
                      <div
                        class="c22 c23"
                      >
                        <span
                          class="c14 c24"
                        >
                          Collection types help you manage several entries, Single types are suitable to manage only one entry.
                        </span>
                         
                        <span
                          class="c14 c24"
                        >
                          Ex: For a Blog website, Articles would be a Collection type whereas a Homepage would be a Single type.
                        </span>
                      </div>
                      <button
                        aria-disabled="false"
                        class="c25 c26 c8 c27"
                        type="button"
                      >
                        <span
                          class="c14 c28"
                        >
                          Build a Collection type
                        </span>
                        <div
                          aria-hidden="true"
                          class="c16"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c6"
                >
                  <button
                    aria-disabled="false"
                    class="c25 c26 c8 c29"
                    type="button"
                  >
                    <span
                      class="c14 c28"
                    >
                      Skip the tour
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `);
  });

  it('should not render modal when no currentStep', () => {
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
      currentStep: null,
    }));

    const { queryByText } = render(App);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });

  it('should not render modal when currentStep but isGuidedTourVisible is false', () => {
    useGuidedTour.mockImplementation(() => ({
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
      currentStep: 'contentTypeBuilder.create',
    }));

    const { queryByText } = render(App);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });
});
