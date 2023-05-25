import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { DocAssetCard } from '../DocAssetCard';
import en from '../../../translations/en.json';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x) => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('DocAssetCard', () => {
  it('snapshots the component', () => {
    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <DocAssetCard
          name="hello.png"
          extension="png"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        background: #ffffff;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #eaeaef;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        height: 100%;
      }

      .c2 {
        position: relative;
      }

      .c5 {
        position: start;
      }

      .c10 {
        position: end;
      }

      .c14 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c18 {
        width: 100%;
        height: 5.5rem;
      }

      .c21 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c24 {
        padding-top: 4px;
      }

      .c28 {
        padding-top: 4px;
        -webkit-box-flex: 1;
        -webkit-flex-grow: 1;
        -ms-flex-positive: 1;
        flex-grow: 1;
      }

      .c30 {
        background: #eaeaef;
        padding-right: 8px;
        padding-left: 8px;
        min-width: 20px;
      }

      .c25 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c26 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c34 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
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

      .c31 {
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c32 {
        border-radius: 4px;
        height: 1.5rem;
      }

      .c15 {
        position: relative;
        outline: none;
      }

      .c15 > svg {
        height: 12px;
        width: 12px;
      }

      .c15 > svg > g,
      .c15 > svg path {
        fill: #ffffff;
      }

      .c15[aria-disabled='true'] {
        pointer-events: none;
      }

      .c15:after {
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

      .c15:focus-visible {
        outline: none;
      }

      .c15:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c9 {
        height: 18px;
        min-width: 18px;
        margin: 0;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c9:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c9:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
        width: 10px;
        height: 10px;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c9:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c9:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c9:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c9:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        -webkit-transform: translateX(-50%) translateY(-50%);
        -ms-transform: translateX(-50%) translateY(-50%);
        transform: translateX(-50%) translateY(-50%);
      }

      .c9:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c9:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c17 {
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

      .c7 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c7 > * + * {
        margin-left: 8px;
      }

      .c8 {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .c12 {
        position: absolute;
        top: 12px;
        right: 12px;
      }

      .c29 {
        margin-left: auto;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
      }

      .c33 {
        margin-left: 4px;
      }

      .c23 {
        word-break: break-all;
      }

      .c4 {
        border-bottom: 1px solid #eaeaef;
      }

      .c16 svg > g,
      .c16 svg path {
        fill: #8e8ea9;
      }

      .c16:hover svg > g,
      .c16:hover svg path {
        fill: #666687;
      }

      .c16:active svg > g,
      .c16:active svg path {
        fill: #a5a5ba;
      }

      .c16[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c27 {
        text-transform: uppercase;
      }

      .c13 {
        opacity: 0;
      }

      .c13:focus-within {
        opacity: 1;
      }

      .c1 {
        cursor: pointer;
      }

      .c1:hover .c11 {
        opacity: 1;
      }

      .c20 svg {
        font-size: 3rem;
      }

      .c19 {
        border-radius: 4px 4px 0 0;
        background: linear-gradient(180deg,#ffffff 0%,#f6f6f9 121.48%);
      }

      <div>
        <article
          aria-labelledby="1-title"
          class="c0 c1"
          role="button"
          tabindex="-1"
        >
          <div
            class="c2 c3 c4"
          >
            <div>
              <div
                class="c5 c6 c7 c8"
              >
                <div
                  class=""
                >
                  <input
                    aria-labelledby="1-title"
                    class="c9"
                    type="checkbox"
                  />
                </div>
              </div>
            </div>
            <div
              class="c10 c6 c7 c11 c12 c13"
            >
              <span>
                <button
                  aria-disabled="false"
                  aria-labelledby="0"
                  class="c14 c3 c15 c16"
                  tabindex="0"
                  type="button"
                >
                  <span
                    class="c17"
                  >
                    Edit
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
                      clip-rule="evenodd"
                      d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 0 1 1.887 0l3.118 3.118ZM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0Z"
                      fill="#212134"
                      fill-rule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            </div>
            <div
              class="c18 c3 c19"
            >
              <span
                class="c20"
              >
                <svg
                  aria-label="hello.png"
                  fill="none"
                  height="1rem"
                  viewBox="0 0 24 33"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clip-rule="evenodd"
                    d="m16.39.749 6.915 7.377A2.59 2.59 0 0 1 24 9.877v19.638c0 1.381-1.042 2.493-2.337 2.493H2.337C1.042 32.008 0 30.896 0 29.515V2.5C0 1.827.253 1.22.695.75 1.137.277 1.705.008 2.337.008h12.41c.6 0 1.2.27 1.643.74Zm.473 7.983h5.116L15.82 2.197V7.62c0 .607.474 1.112 1.042 1.112ZM2.337 30.559h19.326c.537 0 .98-.471.98-1.044V10.18h-5.78c-1.326 0-2.4-1.145-2.4-2.56V1.456H2.337a.949.949 0 0 0-.695.303c-.19.203-.284.472-.284.741v27.015c0 .573.442 1.044.979 1.044Zm3.358-5.248h12.442c.379 0 .695.326.726.718 0 .392-.316.718-.694.718H5.695c-.38 0-.695-.326-.695-.718 0-.392.316-.718.695-.718Zm12.442-5.287H5.695c-.38 0-.695.327-.695.718 0 .392.316.718.695.718h12.474c.378 0 .694-.326.694-.718 0-.391-.347-.718-.726-.718ZM5.695 14.738h12.442c.379 0 .726.326.726.718 0 .391-.316.718-.694.718H5.695c-.38 0-.695-.327-.695-.718 0-.392.316-.718.695-.718Z"
                    fill="#C0C0CF"
                    fill-rule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div
            class="c21"
          >
            <div
              class="c22"
            >
              <div
                class="c23"
              >
                <div
                  class="c24"
                >
                  <h2
                    class="c25"
                    id="1-title"
                  >
                    hello.png
                  </h2>
                </div>
                <div
                  class="c26"
                >
                  <span
                    class="c27"
                  >
                    png
                  </span>
                  
                </div>
              </div>
              <div
                class="c28 c6"
              >
                <div
                  class="c29"
                >
                  <div
                    class="c30 c31 c32 c33"
                  >
                    <span
                      class="c34"
                    >
                      Doc
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
        <div
          class="c17"
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
