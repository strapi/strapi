import React from 'react';
import { render as renderTL } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import en from '../../../translations/en.json';
import { UploadAssetDialog } from '../UploadAssetDialog';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

const render = (props = { onSucces: () => {}, onError: () => {} }) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <UploadAssetDialog {...props} />
    </ThemeProvider>,
    { container: document.body }
  );

describe('', () => {
  it('snapshots the component', () => {
    const { container } = render();

    expect(container).toMatchInlineSnapshot(`
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
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
      }

      .c1 {
        position: absolute;
        z-index: 3;
        inset: 0;
        background: rgb(220,220,228,0.8);
        padding: 0 40px;
      }

      .c3 {
        max-width: 51.875rem;
        margin: 0 auto;
        overflow: hidden;
        margin-top: 10%;
      }

      .c6 {
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

      .c5 {
        border-bottom: 1px solid #eaeaef;
      }

      .c7 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c8 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c19 {
        background: #eaeaef;
      }

      .c20 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c11 {
        padding-top: 24px;
        padding-right: 40px;
        padding-left: 40px;
      }

      .c21 {
        padding-top: 16px;
        padding-bottom: 16px;
      }

      .c14 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c18 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c15 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c16 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c12 {
        padding: 16px;
      }

      .c13 {
        border-bottom: 2px solid #4945ff;
      }

      .c17 {
        border-bottom: 2px solid transparent;
      }

      <body
        class="lock-body-scroll"
      >
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
        <div
          data-react-portal="true"
        >
          <div
            class="c1"
          >
            <div>
              <div
                aria-labelledby="title"
                aria-modal="true"
                class="c2 c3"
                role="dialog"
              >
                <div
                  class="c4 c5"
                >
                  <div
                    class="c6"
                  >
                    <h2
                      class="c7 c8"
                      id="title"
                    >
                      Upload assets
                    </h2>
                    <button
                      aria-disabled="false"
                      aria-label="Close the modal"
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
                </div>
                <div>
                  <div
                    class="c11"
                  >
                    <div
                      aria-label="How do you want to upload your assets?"
                      role="tablist"
                    >
                      <button
                        aria-controls="tabgroup-1-0-tabpanel"
                        aria-selected="true"
                        id="tabgroup-1-0-tab"
                        role="tab"
                        tabindex="0"
                        type="button"
                      >
                        <div
                          class="c12 c13"
                        >
                          <span
                            class="c14 c15 c16"
                          >
                            From computer
                          </span>
                        </div>
                      </button>
                      <button
                        aria-selected="false"
                        id="tabgroup-1-1-tab"
                        role="tab"
                        tabindex="-1"
                        type="button"
                      >
                        <div
                          class="c12 c17"
                        >
                          <span
                            class="c18 c15 c16"
                          >
                            From url
                          </span>
                        </div>
                      </button>
                    </div>
                    <hr
                      class="c19 c20"
                    />
                  </div>
                  <div>
                    <div
                      aria-labelledby="tabgroup-1-0-tab"
                      id="tabgroup-1-0-tabpanel"
                      role="tabpanel"
                      tabindex="0"
                    >
                      <div
                        class="c21"
                      >
                        From computer form
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `);
  });
});
