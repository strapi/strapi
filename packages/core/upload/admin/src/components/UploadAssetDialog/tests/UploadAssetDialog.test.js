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
        position: fixed;
        z-index: 4;
        inset: 0;
        background: rgb(220,220,228,0.8);
        padding: 0 40px;
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
      }

      .c3 {
        width: 51.875rem;
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

      .c35 {
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

      .c5 {
        border-bottom: 1px solid #eaeaef;
      }

      .c34 {
        border-top: 1px solid #eaeaef;
      }

      .c36 > * + * {
        margin-left: 8px;
      }

      .c28 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
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
        padding-top: 24px;
        padding-right: 40px;
        padding-bottom: 24px;
        padding-left: 40px;
      }

      .c22 {
        background: #f6f6f9;
        padding-top: 64px;
        padding-bottom: 64px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
      }

      .c27 {
        padding-top: 12px;
        padding-bottom: 20px;
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

      .c32 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c29 {
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

      .c29 svg {
        height: 12px;
        width: 12px;
      }

      .c29 svg > g,
      .c29 svg path {
        fill: #ffffff;
      }

      .c29[aria-disabled='true'] {
        pointer-events: none;
      }

      .c30 {
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

      .c30 .sc-gqdwHF {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c30 .c31 {
        color: #ffffff;
      }

      .c30[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c30[aria-disabled='true'] .c31 {
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

      .c30[aria-disabled='true']:active .c31 {
        color: #666687;
      }

      .c30[aria-disabled='true']:active svg > g,
      .c30[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c30:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c30:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c37 {
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

      .c37 .sc-gqdwHF {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c37 .c31 {
        color: #ffffff;
      }

      .c37[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c37[aria-disabled='true'] .c31 {
        color: #666687;
      }

      .c37[aria-disabled='true'] svg > g,
      .c37[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c37[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c37[aria-disabled='true']:active .c31 {
        color: #666687;
      }

      .c37[aria-disabled='true']:active svg > g,
      .c37[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c37:hover {
        background-color: #f6f6f9;
      }

      .c37:active {
        background-color: #eaeaef;
      }

      .c37 .c31 {
        color: #32324d;
      }

      .c37 svg > g,
      .c37 svg path {
        fill: #32324d;
      }

      .c24 {
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

      .c33 {
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

      .c25 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c26 {
        font-size: 3.75rem;
      }

      .c26 svg path {
        fill: #4945ff;
      }

      .c23 {
        border-style: dashed;
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
                      <form>
                        <div
                          class="c21"
                        >
                          <label>
                            <div
                              class="c22 c23"
                            >
                              <div
                                class="c24"
                              >
                                <div
                                  class="c25"
                                >
                                  <div
                                    class="c26"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      fill="none"
                                      height="1em"
                                      viewBox="0 0 24 20"
                                      width="1em"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M21.569 2.398H7.829v1.586h13.74c.47 0 .826.5.826 1.094v9.853l-2.791-3.17a2.13 2.13 0 00-.74-.55 2.211 2.211 0 00-.912-.196 2.213 2.213 0 00-.912.191 2.13 2.13 0 00-.74.546l-2.93 3.385-2.974-3.36a2.146 2.146 0 00-.74-.545 2.23 2.23 0 00-.911-.193c-.316.002-.628.07-.913.2-.286.13-.538.319-.739.553l-2.931 3.432V7.653H2.51v9.894c.023.153.06.304.108.452v.127l.041.095c.057.142.126.28.207.412l.099.15c.074.107.157.207.247.302l.124.119c.13.118.275.222.43.309h.024c.36.214.775.327 1.198.325h16.515c.36-.004.716-.085 1.039-.24.323-.153.606-.375.827-.648a2.78 2.78 0 00.504-.888c.066-.217.108-.44.124-.666V5.078a2.497 2.497 0 00-.652-1.81 2.706 2.706 0 00-1.776-.87z"
                                        fill="#32324D"
                                      />
                                      <path
                                        d="M12.552 9.199c.912 0 1.651-.71 1.651-1.586 0-.875-.74-1.585-1.651-1.585-.912 0-1.652.71-1.652 1.585 0 .876.74 1.586 1.652 1.586zM3.303 6.408h.826V3.997h2.477v-.793-.793H4.129V0h-.826c-.219 0-.85.002-.826 0v2.411H0v1.586h2.477v2.41h.826z"
                                        fill="#32324D"
                                      />
                                    </svg>
                                  </div>
                                  <div
                                    class="c27"
                                  >
                                    <span
                                      class="c28"
                                    >
                                      Drag & Drop here or
                                    </span>
                                  </div>
                                  <button
                                    aria-disabled="false"
                                    class="c29 c30"
                                    type="button"
                                  >
                                    <span
                                      class="c31 c32"
                                    >
                                      Browse files
                                    </span>
                                  </button>
                                  <div
                                    class="c33"
                                  >
                                    <input
                                      multiple=""
                                      name="files"
                                      tabindex="-1"
                                      type="file"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                        <div
                          class="c4 c34"
                        >
                          <div
                            class="c6"
                          >
                            <div
                              class="c35 c36"
                            >
                              <button
                                aria-disabled="false"
                                class="c29 c37"
                                type="button"
                              >
                                <span
                                  class="c31 c32"
                                />
                              </button>
                            </div>
                            <div
                              class="c35 c36"
                            />
                          </div>
                        </div>
                      </form>
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
