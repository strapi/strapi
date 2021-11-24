import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { FromComputerForm } from '../FromComputerForm';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils/getTrad', () => x => x);

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || 'App level translation') }),
}));

describe('FromComputerForm', () => {
  it('snapshots the component', async () => {
    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <FromComputerForm onClose={jest.fn()} onAddAssets={jest.fn()} />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c22 {
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

      .c0 {
        padding-top: 24px;
        padding-right: 40px;
        padding-bottom: 24px;
        padding-left: 40px;
      }

      .c1 {
        background: #f6f6f9;
        padding-top: 64px;
        padding-bottom: 64px;
        border-radius: 4px;
        border-color: #c0c0cf;
        border: 1px solid #c0c0cf;
        position: relative;
      }

      .c7 {
        padding-top: 12px;
        padding-bottom: 20px;
      }

      .c9 {
        position: absolute;
        left: 0px;
        right: 0px;
        top: 0px;
        bottom: 0px;
        z-index: 1;
        width: 100%;
      }

      .c11 {
        position: relative;
      }

      .c3 {
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

      .c4 {
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

      .c8 {
        color: #666687;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c15 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c12 {
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

      .c12 svg {
        height: 12px;
        width: 12px;
      }

      .c12 svg > g,
      .c12 svg path {
        fill: #ffffff;
      }

      .c12[aria-disabled='true'] {
        pointer-events: none;
      }

      .c12:after {
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

      .c12:focus-visible {
        outline: none;
      }

      .c12:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c13 {
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

      .c13 .sc-fTNIjK {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c13 .c14 {
        color: #ffffff;
      }

      .c13[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c13[aria-disabled='true'] .c14 {
        color: #666687;
      }

      .c13[aria-disabled='true'] svg > g,
      .c13[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c13[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c13[aria-disabled='true']:active .c14 {
        color: #666687;
      }

      .c13[aria-disabled='true']:active svg > g,
      .c13[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c13:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c13:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c21 {
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

      .c21 .sc-fTNIjK {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c21 .c14 {
        color: #ffffff;
      }

      .c21[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c21[aria-disabled='true'] .c14 {
        color: #666687;
      }

      .c21[aria-disabled='true'] svg > g,
      .c21[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c21[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c21[aria-disabled='true']:active .c14 {
        color: #666687;
      }

      .c21[aria-disabled='true']:active svg > g,
      .c21[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c21:hover {
        background-color: #f6f6f9;
      }

      .c21:active {
        background-color: #eaeaef;
      }

      .c21 .c14 {
        color: #32324d;
      }

      .c21 svg > g,
      .c21 svg path {
        fill: #32324d;
      }

      .c16 {
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
      }

      .c18 {
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

      .c19 {
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

      .c17 {
        border-radius: 0 0 4px 4px;
        border-top: 1px solid #eaeaef;
      }

      .c20 > * + * {
        margin-left: 8px;
      }

      .c5 {
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c6 {
        font-size: 3.75rem;
      }

      .c6 svg path {
        fill: #4945ff;
      }

      .c2 {
        border-style: dashed;
      }

      .c10 {
        opacity: 0;
        cursor: pointer;
      }

      <div>
        <form>
          <div
            class="c0"
          >
            <label>
              <div
                class="c1 c2"
              >
                <div
                  class="c3"
                >
                  <div
                    class="c4 c5"
                  >
                    <div
                      class="c6"
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
                          d="M21.525 2.394H7.814v1.582h13.711c.47 0 .824.498.824 1.091v9.834l-2.785-3.165c-.2-.233-.453-.42-.738-.549a2.21 2.21 0 00-.91-.194 2.209 2.209 0 00-.91.19 2.126 2.126 0 00-.739.545l-2.925 3.378-2.967-3.354a2.143 2.143 0 00-.739-.543 2.226 2.226 0 00-.909-.193c-.315.002-.626.07-.911.2-.285.13-.536.318-.737.552l-2.925 3.425V7.637H2.505v9.874c.023.153.059.304.107.451v.127l.042.095c.056.142.125.28.206.411l.099.15c.074.106.157.207.247.301l.123.119c.13.118.274.221.429.308h.025c.358.214.772.327 1.195.325h16.481a2.47 2.47 0 001.037-.239c.322-.153.605-.375.826-.648.222-.263.392-.564.502-.886.067-.216.108-.439.124-.664V5.067a2.493 2.493 0 00-.65-1.805 2.7 2.7 0 00-1.773-.868z"
                          fill="#32324D"
                        />
                        <path
                          d="M12.526 9.18c.91 0 1.648-.708 1.648-1.582 0-.874-.738-1.582-1.648-1.582-.91 0-1.648.708-1.648 1.582 0 .874.738 1.582 1.648 1.582zM3.297 6.395h.823V3.988h2.473v-.79-.792H4.12V0h-.823c-.219 0-.849.002-.825 0v2.406H0v1.582h2.472v2.407h.825z"
                          fill="#32324D"
                        />
                      </svg>
                    </div>
                    <div
                      class="c7"
                    >
                      <span
                        class="c8"
                      >
                        Drag & Drop here or
                      </span>
                    </div>
                    <input
                      class="c9 c10"
                      multiple=""
                      name="files"
                      tabindex="-1"
                      type="file"
                      width="100%"
                    />
                    <div
                      class="c11"
                    >
                      <button
                        aria-disabled="false"
                        class="c12 c13"
                        type="button"
                      >
                        <span
                          class="c14 c15"
                        >
                          Browse files
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>
          <div
            class="c16 c17"
          >
            <div
              class="c18"
            >
              <div
                class="c19 c20"
              >
                <button
                  aria-disabled="false"
                  class="c12 c21"
                  type="button"
                >
                  <span
                    class="c14 c15"
                  >
                    App level translation
                  </span>
                </button>
              </div>
              <div
                class="c19 c20"
              />
            </div>
          </div>
        </form>
        <div
          class="c22"
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
    `);
  });
});
