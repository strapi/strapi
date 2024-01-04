import { useGuidedTour } from '@strapi/helper-plugin';
import { render, screen } from '@tests/utils';

import { GuidedTourModal } from '../Modal';

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

describe('<GuidedTourModal />', () => {
  it('should match the snapshot with contentTypeBuilder.create layout', async () => {
    render(<GuidedTourModal />);

    expect(screen.getByText('🧠 Create a first Collection type')).toBeInTheDocument();

    expect(document.body).toMatchInlineSnapshot(`
      .c2 {
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

      .c17 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #4945ff;
      }

      .c20 {
        font-size: 0.875rem;
        line-height: 1.43;
        font-weight: 500;
        color: #ffffff;
      }

      .c21 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        font-weight: 600;
        color: #32324d;
      }

      .c25 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c29 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #ffffff;
      }

      .c0 {
        margin-left: -250px;
        position: fixed;
        left: 50%;
        top: 2.875rem;
        z-index: 10;
        width: 31.25rem;
      }

      .c3 {
        padding: 40px;
      }

      .c6 {
        background: #ffffff;
        padding: 16px;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
        width: 41.25rem;
      }

      .c9 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        cursor: pointer;
      }

      .c12 {
        padding-right: 32px;
        padding-left: 32px;
      }

      .c14 {
        margin-right: 40px;
        min-width: 1.875rem;
      }

      .c15 {
        background: #7b79ff;
        border-radius: 4px;
        width: 0.125rem;
        height: 100%;
        min-height: 1.5rem;
      }

      .c19 {
        background: #4945ff;
        padding: 8px;
        padding-top: 12px;
        padding-bottom: 12px;
        border-radius: 50%;
        width: 1.875rem;
        height: 1.875rem;
      }

      .c23 {
        padding-bottom: 24px;
      }

      .c26 {
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
        gap: 8px;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c7 {
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

      .c13 {
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

      .c18 {
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

      .c24 {
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

      .c27 {
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

      .c10 {
        position: relative;
        outline: none;
      }

      .c10 > svg {
        height: 12px;
        width: 12px;
      }

      .c10 > svg > g,
      .c10 > svg path {
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

      .c28 {
        height: 2rem;
      }

      .c28 svg {
        height: 0.75rem;
        width: auto;
      }

      .c28[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true'] .c16 {
        color: #666687;
      }

      .c28[aria-disabled='true'] svg > g,
      .c28[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c28[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true']:active .c16 {
        color: #666687;
      }

      .c28[aria-disabled='true']:active svg > g,
      .c28[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c28:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c28:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c28 svg > g,
      .c28 svg path {
        fill: #ffffff;
      }

      .c30 {
        height: 2rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c30 svg {
        height: 0.75rem;
        width: auto;
      }

      .c30[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c30[aria-disabled='true'] .c16 {
        color: #666687;
      }

      .c30[aria-disabled='true'] svg > g,
      .c30[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c30[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c30[aria-disabled='true']:active .c16 {
        color: #666687;
      }

      .c30[aria-disabled='true']:active svg > g,
      .c30[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c30:hover {
        background-color: #f6f6f9;
      }

      .c30:active {
        background-color: #eaeaef;
      }

      .c30 .c16 {
        color: #32324d;
      }

      .c30 svg > g,
      .c30 svg path {
        fill: #32324d;
      }

      .c11 {
        border-color: #dcdce4;
        height: 2rem;
        width: 2rem;
      }

      .c11 svg g,
      .c11 svg path {
        fill: #8e8ea9;
      }

      .c11:hover svg g,
      .c11:focus svg g,
      .c11:hover svg path,
      .c11:focus svg path {
        fill: #666687;
      }

      .c11[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c5 {
        position: fixed;
        z-index: 4;
        inset: 0;
        background: #32324d1F;
      }

      <body>
        <div>
          <div
            class="c0 c1"
          />
          <div
            class="c2"
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
            class="c3 c4 c5"
          >
            <div>
              <div
                aria-modal="true"
                class="c6 c7"
                role="dialog"
              >
                <div
                  class="c8"
                >
                  <button
                    aria-disabled="false"
                    class="c9 c4 c10 c11"
                    type="button"
                  >
                    <span
                      class="c2"
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
                  class="c12"
                >
                  <div
                    class="c13"
                  >
                    <div
                      class="c14 c4"
                    >
                      <div
                        class="c15"
                      />
                    </div>
                    <span
                      class="c16 c17"
                    >
                      3 steps to get started
                    </span>
                  </div>
                  <div
                    class="c18"
                  >
                    <div
                      class="c14 c18"
                    >
                      <div
                        class="c19 c4"
                      >
                        <span
                          class="c16 c20"
                        >
                          3
                        </span>
                      </div>
                    </div>
                    <h3
                      class="c16 c21"
                      id="title"
                    >
                      🧠 Create a first Collection type
                    </h3>
                  </div>
                  <div
                    class="c13"
                  >
                    <div
                      class="c14 c22"
                    />
                    <div
                      class=""
                    >
                      <div
                        class="c23 c24"
                      >
                        <span
                          class="c16 c25"
                        >
                          Collection types help you manage several entries, Single types are suitable to manage only one entry.
                        </span>
                         
                        <span
                          class="c16 c25"
                        >
                          Ex: For a Blog website, Articles would be a Collection type whereas a Homepage would be a Single type.
                        </span>
                      </div>
                      <button
                        aria-disabled="false"
                        class="c26 c27 c10 c28"
                        type="button"
                      >
                        <span
                          class="c16 c29"
                        >
                          Build a Collection type
                        </span>
                        <div
                          aria-hidden="true"
                          class="c18"
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
                  class="c8"
                >
                  <button
                    aria-disabled="false"
                    class="c26 c27 c10 c30"
                    type="button"
                  >
                    <span
                      class="c16 c29"
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
    // @ts-expect-error – mocking
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

    const { queryByText } = render(<GuidedTourModal />);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });

  it('should not render modal when currentStep but isGuidedTourVisible is false', () => {
    // @ts-expect-error – mocking
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

    const { queryByText } = render(<GuidedTourModal />);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });
});
