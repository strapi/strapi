import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { FromComputerForm } from '../FromComputerForm';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

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
      .c19 {
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
        border: 1px solid #c0c0cf;
      }

      .c6 {
        padding-top: 12px;
        padding-bottom: 20px;
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

      .c12 {
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

      .c7 {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
        color: #666687;
      }

      .c13 {
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
      }

      .c15 {
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

      .c16 {
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

      .c14 {
        border-top: 1px solid #eaeaef;
      }

      .c17 > * + * {
        margin-left: 8px;
      }

      .c11 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c8 {
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

      .c8 svg {
        height: 12px;
        width: 12px;
      }

      .c8 svg > g,
      .c8 svg path {
        fill: #ffffff;
      }

      .c8[aria-disabled='true'] {
        pointer-events: none;
      }

      .c9 {
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

      .c9 .sc-dYzmtA {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c9 .c10 {
        color: #ffffff;
      }

      .c9[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c9[aria-disabled='true'] svg > g,
      .c9[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c9[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c9[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c9[aria-disabled='true']:active svg > g,
      .c9[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c9:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c9:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c18 {
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

      .c18 .sc-dYzmtA {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c18 .c10 {
        color: #ffffff;
      }

      .c18[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c18[aria-disabled='true'] .c10 {
        color: #666687;
      }

      .c18[aria-disabled='true'] svg > g,
      .c18[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c18[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c18[aria-disabled='true']:active .c10 {
        color: #666687;
      }

      .c18[aria-disabled='true']:active svg > g,
      .c18[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c18:hover {
        background-color: #f6f6f9;
      }

      .c18:active {
        background-color: #eaeaef;
      }

      .c18 .c10 {
        color: #32324d;
      }

      .c18 svg > g,
      .c18 svg path {
        fill: #32324d;
      }

      .c4 {
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

      .c5 {
        font-size: 3.75rem;
      }

      .c5 svg path {
        fill: #4945ff;
      }

      .c2 {
        border-style: dashed;
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
                    class="c4"
                  >
                    <div
                      class="c5"
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
                      class="c6"
                    >
                      <span
                        class="c7"
                      >
                        Drag & Drop here or
                      </span>
                    </div>
                    <button
                      aria-disabled="false"
                      class="c8 c9"
                      type="button"
                    >
                      <span
                        class="c10 c11"
                      >
                        Browse files
                      </span>
                    </button>
                    <div
                      class="c12"
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
            class="c13 c14"
          >
            <div
              class="c15"
            >
              <div
                class="c16 c17"
              >
                <button
                  aria-disabled="false"
                  class="c8 c18"
                  type="button"
                >
                  <span
                    class="c10 c11"
                  >
                    App level translation
                  </span>
                </button>
              </div>
              <div
                class="c16 c17"
              />
            </div>
          </div>
        </form>
        <div
          class="c19"
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
