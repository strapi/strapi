import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useGuidedTour } from '@strapi/helper-plugin';
import Theme from '../../../Theme';
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
  <Theme>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <GuidedTourModal />
    </IntlProvider>
  </Theme>
);

describe('<GuidedTourModal />', () => {
  it('should match the snapshot with contentTypeBuilder.create layout', async () => {
    render(App);

    expect(screen.getByText('🧠 Create a first Collection type')).toBeInTheDocument();

    expect(document.body).toMatchInlineSnapshot(`
      .c9 {
        padding-right: 32px;
        padding-bottom: 0px;
        padding-left: 32px;
      }

      .c12 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 1.5rem;
      }

      .c15 {
        padding-top: 12px;
        padding-bottom: 12px;
      }

      .c26 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c28 {
        padding-left: 8px;
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
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c24 .c27 {
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
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c24:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c29 {
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

      .c29 .c27 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c29 .c25 {
        color: #ffffff;
      }

      .c29[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c29[aria-disabled='true'] .c25 {
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

      .c29[aria-disabled='true']:active .c25 {
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

      .c29 .c25 {
        color: #32324d;
      }

      .c29 svg > g,
      .c29 svg path {
        fill: #32324d;
      }

      .c1 {
        padding: 40px;
      }

      .c11 {
        margin-right: 40px;
        min-width: 1.875rem;
      }

      .c16 {
        background: #4945ff;
        padding: 8px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c2 {
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

      .c6 {
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

      .c10 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
      }

      .c14 {
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

      .c19 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c7 {
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

      .c7 svg {
        height: 12px;
        width: 12px;
      }

      .c7 svg > g,
      .c7 svg path {
        fill: #ffffff;
      }

      .c7[aria-disabled='true'] {
        pointer-events: none;
      }

      .c7:after {
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

      .c7:focus-visible {
        outline: none;
      }

      .c7:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c8 {
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

      .c8 svg > g,
      .c8 svg path {
        fill: #8e8ea9;
      }

      .c8:hover svg > g,
      .c8:hover svg path {
        fill: #666687;
      }

      .c8:active svg > g,
      .c8:active svg path {
        fill: #a5a5ba;
      }

      .c8[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c8[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c4 {
        background: #ffffff;
        padding: 16px;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
        width: 41.25rem;
      }

      .c20 {
        padding-bottom: 24px;
      }

      .c5 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c5 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c5 > * + * {
        margin-top: 40px;
      }

      .c21 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c21 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c21 > * + * {
        margin-top: 16px;
      }

      .c13 {
        color: #4945ff;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c17 {
        font-weight: 500;
        color: #ffffff;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c18 {
        font-weight: 600;
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c22 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
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

      .c3 {
        position: fixed;
        z-index: 4;
        inset: 0;
        background: #32324d33;
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
            class="c1 c2 c3"
          >
            <div>
              <div
                aria-modal="true"
                class="c4 c5"
                role="dialog"
                width="41.25rem"
              >
                <div
                  class="c6"
                >
                  <button
                    aria-disabled="false"
                    aria-label="Close"
                    class="c7 c8"
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
                  class="c9"
                >
                  <div
                    class="c10"
                  >
                    <div
                      class="c11 c2"
                    >
                      <div
                        class="c12"
                        height="100%"
                        width="0.125rem"
                      />
                    </div>
                    <span
                      class="c13"
                    >
                      3 steps to get started
                    </span>
                  </div>
                  <div
                    class="c14"
                  >
                    <div
                      class="c11 c14"
                    >
                      <div
                        class="c15"
                      >
                        <div
                          class="c16 c2"
                          height="1.875rem"
                          width="1.875rem"
                        >
                          <span
                            class="c17"
                          >
                            3
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3
                      class="c18"
                      id="title"
                    >
                      🧠 Create a first Collection type
                    </h3>
                  </div>
                  <div
                    class="c10"
                  >
                    <div
                      class="c11 c19"
                    />
                    <div
                      class=""
                    >
                      <div
                        class="c20 c21"
                      >
                        <span
                          class="c22"
                        >
                          Collection types help you manage several entries, Single types are suitable to manage only one entry.
                        </span>
                         
                        <span
                          class="c22"
                        >
                          Ex: For a Blog website, Articles would be a Collection type whereas a Homepage would be a Single type.
                        </span>
                      </div>
                      <button
                        aria-disabled="false"
                        class="c23 c24"
                        type="button"
                      >
                        <span
                          class="c25 c26"
                        >
                          Build a Collection type
                        </span>
                        <div
                          aria-hidden="true"
                          class="c27 c28"
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
                  class="c6"
                >
                  <button
                    aria-disabled="false"
                    class="c23 c29"
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
