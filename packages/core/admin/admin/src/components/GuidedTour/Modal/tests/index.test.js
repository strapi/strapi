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

      .c2 {
        padding: 40px;
      }

      .c5 {
        background: #ffffff;
        padding: 16px;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
        width: 41.25rem;
      }

      .c11 {
        padding-right: 32px;
        padding-bottom: 0px;
        padding-left: 32px;
      }

      .c13 {
        margin-right: 40px;
        min-width: 1.875rem;
      }

      .c14 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 1.5rem;
      }

      .c18 {
        padding-top: 12px;
        padding-bottom: 12px;
      }

      .c19 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c23 {
        padding-bottom: 24px;
      }

      .c28 {
        padding-left: 8px;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c6 {
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

      .c8 {
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

      .c12 {
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
      }

      .c22 {
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

      .c16 {
        color: #4945ff;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c20 {
        font-weight: 500;
        color: #ffffff;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c21 {
        font-weight: 600;
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c25 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c27 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c7 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c7 > * + * {
        margin-top: 40px;
      }

      .c24 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c24 > * + * {
        margin-top: 16px;
      }

      .c9 {
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

      .c9 svg {
        height: 12px;
        width: 12px;
      }

      .c9 svg > g,
      .c9 svg path {
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

      .c26 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
      }

      .c26 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c26 .c15 {
        color: #ffffff;
      }

      .c26[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true'] .c15 {
        color: #666687;
      }

      .c26[aria-disabled='true'] svg > g,
      .c26[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c26[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true']:active .c15 {
        color: #666687;
      }

      .c26[aria-disabled='true']:active svg > g,
      .c26[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c26:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c26:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c26 svg > g,
      .c26 svg path {
        fill: #ffffff;
      }

      .c29 {
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

      .c29 .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c29 .c15 {
        color: #ffffff;
      }

      .c29[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c29[aria-disabled='true'] .c15 {
        color: #666687;
      }

      .c29[aria-disabled='true'] svg > g,
      .c29[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c29[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c29[aria-disabled='true']:active .c15 {
        color: #666687;
      }

      .c29[aria-disabled='true']:active svg > g,
      .c29[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c29:hover {
        background-color: #f6f6f9;
      }

      .c29:active {
        background-color: #eaeaef;
      }

      .c29 .c15 {
        color: #32324d;
      }

      .c29 svg > g,
      .c29 svg path {
        fill: #32324d;
      }

      .c10 {
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

      .c10 svg > g,
      .c10 svg path {
        fill: #8e8ea9;
      }

      .c10:hover svg > g,
      .c10:hover svg path {
        fill: #666687;
      }

      .c10:active svg > g,
      .c10:active svg path {
        fill: #a5a5ba;
      }

      .c10[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c10[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c4 {
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
          data-react-portal="true"
        >
          <div
            class="c1 c2 c3 c4"
          >
            <div>
              <div
                aria-modal="true"
                class="c1 c5 c6 c7"
                role="dialog"
                spacing="8"
                width="41.25rem"
              >
                <div
                  class="c1 c8"
                >
                  <button
                    aria-disabled="false"
                    aria-label="Close"
                    class="c9 c10"
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
                        d="M24 2.417L21.583 0 12 9.583 2.417 0 0 2.417 9.583 12 0 21.583 2.417 24 12 14.417 21.583 24 24 21.583 14.417 12 24 2.417z"
                        fill="#212134"
                      />
                    </svg>
                  </button>
                </div>
                <div
                  class="c1 c11"
                >
                  <div
                    class="c1 c12"
                  >
                    <div
                      class="c1 c13 c3"
                    >
                      <div
                        class="c1 c14"
                        height="100%"
                        width="0.125rem"
                      />
                    </div>
                    <span
                      class="c15 c16"
                    >
                      3 steps to get started
                    </span>
                  </div>
                  <div
                    class="c1 c17"
                  >
                    <div
                      class="c1 c13 c17"
                    >
                      <div
                        class="c1 c18"
                      >
                        <div
                          class="c1 c19 c3"
                          height="1.875rem"
                          width="1.875rem"
                        >
                          <span
                            class="c15 c20"
                          >
                            3
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3
                      class="c15 c21"
                      id="title"
                    >
                      🧠 Create a first Collection type
                    </h3>
                  </div>
                  <div
                    class="c1 c12"
                  >
                    <div
                      class="c1 c13 c22"
                    />
                    <div
                      class="c1 "
                    >
                      <div
                        class="c1 c23 c6 c24"
                        spacing="4"
                      >
                        <span
                          class="c15 c25"
                        >
                          Collection types help you manage several entries, Single types are suitable to manage only one entry.
                        </span>
                         
                        <span
                          class="c15 c25"
                        >
                          Ex: For a Blog website, Articles would be a Collection type whereas a Homepage would be a Single type.
                        </span>
                      </div>
                      <button
                        aria-disabled="false"
                        class="c9 c26"
                        type="button"
                      >
                        <span
                          class="c15 c27"
                        >
                          Build a Collection type
                        </span>
                        <div
                          aria-hidden="true"
                          class="c1 c28"
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
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="c1 c8"
                >
                  <button
                    aria-disabled="false"
                    class="c9 c29"
                    type="button"
                  >
                    <span
                      class="c15 c27"
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
