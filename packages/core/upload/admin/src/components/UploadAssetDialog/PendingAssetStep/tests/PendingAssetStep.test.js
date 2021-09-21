import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { PendingAssetStep } from '../PendingAssetStep';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('AddAssetTest', () => {
  it('snapshots the component with valid cards', () => {
    const assets = [
      {
        source: 'url',
        type: 'image',
        url: 'http://localhost:5000/CPAM.jpg',
        ext: 'jpg',
        mime: 'image/jpeg',
      },
      {
        source: 'url',
        type: 'doc',
        url: 'http://localhost:5000/MARIAGE%20FRACHET%204.pdf',
        ext: 'pdf',
        mime: 'application/pdf',
      },
      {
        source: 'url',
        type: 'video',
        url: 'http://localhost:5000/mov_bbb.mp4',
        ext: 'mp4',
        mime: 'video/mp4',
      },
      {
        source: 'url',
        type: 'unknown',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        ext: 'mp4',
      },
    ];

    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <PendingAssetStep
          assets={assets}
          onClose={jest.fn()}
          onAddAsset={jest.fn()}
          onClickAddAsset={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c54 {
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
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
      }

      .c7 {
        padding-top: 24px;
        padding-right: 40px;
        padding-bottom: 24px;
        padding-left: 40px;
      }

      .c2 {
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

      .c51 {
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

      .c5 {
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

      .c5 svg {
        height: 12px;
        width: 12px;
      }

      .c5 svg > g,
      .c5 svg path {
        fill: #ffffff;
      }

      .c5[aria-disabled='true'] {
        pointer-events: none;
      }

      .c6 svg > g,
      .c6 svg path {
        fill: #8e8ea9;
      }

      .c6:hover svg > g,
      .c6:hover svg path {
        fill: #666687;
      }

      .c6:active svg > g,
      .c6:active svg path {
        fill: #a5a5ba;
      }

      .c6[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c6[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c1 {
        border-bottom: 1px solid #eaeaef;
      }

      .c50 {
        border-top: 1px solid #eaeaef;
      }

      .c52 > * + * {
        margin-left: 8px;
      }

      .c8 {
        overflow: auto;
        max-height: 60vh;
      }

      .c3 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c12 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c13 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c4 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c17 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c14 {
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

      .c14 svg {
        height: 12px;
        width: 12px;
      }

      .c14 svg > g,
      .c14 svg path {
        fill: #ffffff;
      }

      .c14[aria-disabled='true'] {
        pointer-events: none;
      }

      .c15 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c15 .c16 {
        color: #ffffff;
      }

      .c15[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c15[aria-disabled='true'] .c16 {
        color: #666687;
      }

      .c15[aria-disabled='true'] svg > g,
      .c15[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c15[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c15[aria-disabled='true']:active .c16 {
        color: #666687;
      }

      .c15[aria-disabled='true']:active svg > g,
      .c15[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c15:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c15:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c53 {
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c53 .c16 {
        color: #ffffff;
      }

      .c53[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c53[aria-disabled='true'] .c16 {
        color: #666687;
      }

      .c53[aria-disabled='true'] svg > g,
      .c53[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c53[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c53[aria-disabled='true']:active .c16 {
        color: #666687;
      }

      .c53[aria-disabled='true']:active svg > g,
      .c53[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c53:hover {
        background-color: #f6f6f9;
      }

      .c53:active {
        background-color: #eaeaef;
      }

      .c53 .c16 {
        color: #32324d;
      }

      .c53 svg > g,
      .c53 svg path {
        fill: #32324d;
      }

      .c10 {
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
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c9 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c9 > * + * {
        margin-top: 32px;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c11 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c11 > * + * {
        margin-top: 0px;
      }

      .c18 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c19 {
        grid-column: span 4;
        word-break: break-all;
      }

      .c20 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c30 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c35 {
        background: #f6f6f9;
        color: #666687;
        padding: 4px;
        border-radius: 4px;
      }

      .c44 {
        background: #32324d;
        color: #ffffff;
        padding: 4px;
        border-radius: 4px;
      }

      .c23 {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .c25 {
        position: absolute;
        top: 12px;
        right: 12px;
      }

      .c21 {
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

      .c31 {
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

      .c29 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
      }

      .c28 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 10.25rem;
        width: 100%;
        background: repeating-conic-gradient(#f6f6f9 0% 25%,transparent 0% 50%) 50% / 20px 20px;
      }

      .c32 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c33 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c38 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c46 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #ffffff;
      }

      .c39 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c40 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c36 {
        display: inline-block;
      }

      .c37 {
        margin-left: auto;
      }

      .c24 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
      }

      .c24:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c24:checked:after {
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

      .c24:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c24:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c24:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c24:indeterminate:after {
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

      .c24:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c24:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c22 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c45 {
        position: absolute;
        bottom: 4px;
        right: 4px;
      }

      .c26 {
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

      .c26 svg {
        height: 12px;
        width: 12px;
      }

      .c26 svg > g,
      .c26 svg path {
        fill: #ffffff;
      }

      .c26[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27 svg > g,
      .c27 svg path {
        fill: #8e8ea9;
      }

      .c27:hover svg > g,
      .c27:hover svg path {
        fill: #666687;
      }

      .c27:active svg > g,
      .c27:active svg path {
        fill: #a5a5ba;
      }

      .c27[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c27[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c42 {
        text-transform: uppercase;
      }

      .c41 svg {
        font-size: 3rem;
      }

      .c34 {
        text-transform: uppercase;
      }

      .c43 canvas {
        display: block;
        max-width: 100%;
        max-height: 100%;
      }

      .c47 {
        text-transform: uppercase;
      }

      .c49 {
        text-transform: uppercase;
      }

      .c48 svg {
        font-size: 3rem;
      }

      @media (max-width:68.75rem) {
        .c19 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c19 {
          grid-column: span;
        }
      }

      <div>
        <div
          class="c0 c1"
        >
          <div
            class="c2"
          >
            <h2
              class="c3 c4"
              id="title"
            >
              Upload assets
            </h2>
            <button
              aria-disabled="false"
              aria-label="Close the modal"
              class="c5 c6"
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
        <div
          class="c7 c8"
        >
          <div
            class="c9"
          >
            <div
              class="c10"
            >
              <div
                class="c11"
              >
                <span
                  class="c12"
                >
                  {number} assets selected
                </span>
                <span
                  class="c13"
                >
                  Manage the assets before adding them to the Media Library
                </span>
              </div>
              <button
                aria-disabled="false"
                class="c14 c15"
                type="button"
              >
                <span
                  class="c16 c17"
                >
                  Upload new asset
                </span>
              </button>
            </div>
            <div
              class=""
            >
              <div
                class="c18"
              >
                <div
                  class="c19"
                >
                  <div
                    class=""
                  >
                    <article
                      aria-labelledby="card-1-title"
                      class="c20"
                      tabindex="0"
                    >
                      <div
                        class="c21 c22"
                      >
                        <div
                          class="c23"
                        >
                          <input
                            aria-labelledby="card-1-title"
                            checked=""
                            class="c24"
                            type="checkbox"
                          />
                        </div>
                        <div
                          class="c25"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby="tooltip-1"
                              class="c26 c27"
                              tabindex="0"
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                        </div>
                        <div
                          class="c28"
                        >
                          <img
                            aria-hidden="true"
                            class="c29"
                            src="http://localhost:5000/CPAM.jpg"
                          />
                        </div>
                      </div>
                      <div
                        class="c30"
                      >
                        <div
                          class="c31"
                        >
                          <div
                            class=""
                          >
                            <h2
                              class="c32"
                              id="card-1-title"
                            >
                              http://localhost:5000/CPAM.jpg
                            </h2>
                            <div
                              class="c33"
                            >
                              <span
                                class="c34"
                              >
                                jpg
                              </span>
                            </div>
                          </div>
                          <div
                            class="c35 c36 c37"
                          >
                            <span
                              class="c38 c39 c40"
                            >
                              Image
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
                <div
                  class="c19"
                >
                  <div
                    class=""
                  >
                    <article
                      aria-labelledby="card-2-title"
                      class="c20"
                      tabindex="0"
                    >
                      <div
                        class="c21 c22"
                      >
                        <div
                          class="c23"
                        >
                          <input
                            aria-labelledby="card-2-title"
                            checked=""
                            class="c24"
                            type="checkbox"
                          />
                        </div>
                        <div
                          class="c25"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby="tooltip-3"
                              class="c26 c27"
                              tabindex="0"
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                        </div>
                        <div
                          class="c28"
                        >
                          <div
                            class="c31"
                          >
                            <span
                              class="c41"
                            >
                              <svg
                                aria-label="http://localhost:5000/MARIAGE%20FRACHET%204.pdf"
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M20 22H6.5A3.5 3.5 0 013 18.5V5a3 3 0 013-3h14a1 1 0 011 1v18a1 1 0 01-1 1zm-1-2v-3H6.5a1.5 1.5 0 100 3H19z"
                                  fill="#8E8EA9"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        class="c30"
                      >
                        <div
                          class="c31"
                        >
                          <div
                            class=""
                          >
                            <h2
                              class="c32"
                              id="card-2-title"
                            >
                              http://localhost:5000/MARIAGE%20FRACHET%204.pdf
                            </h2>
                            <div
                              class="c33"
                            >
                              <span
                                class="c42"
                              >
                                pdf
                              </span>
                            </div>
                          </div>
                          <div
                            class="c35 c36 c37"
                          >
                            <span
                              class="c38 c39 c40"
                            >
                              Doc
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
                <div
                  class="c19"
                >
                  <div
                    class=""
                  >
                    <article
                      aria-labelledby="card-3-title"
                      class="c20"
                      tabindex="0"
                    >
                      <div
                        class="c21 c22"
                      >
                        <div
                          class="c23"
                        >
                          <input
                            aria-labelledby="card-3-title"
                            checked=""
                            class="c24"
                            type="checkbox"
                          />
                        </div>
                        <div
                          class="c25"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby="tooltip-5"
                              class="c26 c27"
                              tabindex="0"
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                        </div>
                        <div
                          class="c28"
                        >
                          <div
                            class="c31"
                          >
                            <div
                              class="c43"
                            >
                              <video
                                src="http://localhost:5000/mov_bbb.mp4"
                              >
                                <source
                                  type="video/mp4"
                                />
                              </video>
                              <canvas />
                            </div>
                          </div>
                        </div>
                        <time
                          class="c44 c45"
                        >
                          <span
                            class="c46"
                          >
                            ...
                          </span>
                        </time>
                      </div>
                      <div
                        class="c30"
                      >
                        <div
                          class="c31"
                        >
                          <div
                            class=""
                          >
                            <h2
                              class="c32"
                              id="card-3-title"
                            >
                              http://localhost:5000/mov_bbb.mp4
                            </h2>
                            <div
                              class="c33"
                            >
                              <span
                                class="c47"
                              >
                                mp4
                              </span>
                            </div>
                          </div>
                          <div
                            class="c35 c36 c37"
                          >
                            <span
                              class="c38 c39 c40"
                            >
                              Video
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
                <div
                  class="c19"
                >
                  <div
                    class=""
                  >
                    <article
                      aria-labelledby="card-4-title"
                      class="c20"
                      tabindex="0"
                    >
                      <div
                        class="c21 c22"
                      >
                        <div
                          class="c23"
                        >
                          <input
                            aria-labelledby="card-4-title"
                            checked=""
                            class="c24"
                            type="checkbox"
                          />
                        </div>
                        <div
                          class="c25"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby="tooltip-7"
                              class="c26 c27"
                              tabindex="0"
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
                                  clip-rule="evenodd"
                                  d="M23.604 3.514c.528.528.528 1.36 0 1.887l-2.622 2.607-4.99-4.99L18.6.396a1.322 1.322 0 011.887 0l3.118 3.118zM0 24v-4.99l14.2-14.2 4.99 4.99L4.99 24H0z"
                                  fill="#212134"
                                  fill-rule="evenodd"
                                />
                              </svg>
                            </button>
                          </span>
                        </div>
                        <div
                          class="c28"
                        >
                          <div
                            class="c31"
                          >
                            <span
                              class="c48"
                            >
                              <svg
                                aria-label="https://www.w3schools.com/html/mov_bbb.mp4"
                                fill="none"
                                height="1em"
                                viewBox="0 0 216 120"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <g
                                  opacity="0.8"
                                >
                                  <path
                                    clip-rule="evenodd"
                                    d="M119 28a7 7 0 110 14h64a7 7 0 110 14h22a7 7 0 110 14h-19a7 7 0 100 14h6a7 7 0 110 14h-52a7.024 7.024 0 01-1.5-.161A7.024 7.024 0 01137 98H46a7 7 0 110-14H7a7 7 0 110-14h40a7 7 0 100-14H22a7 7 0 110-14h40a7 7 0 110-14h57zm90 56a7 7 0 110 14 7 7 0 010-14z"
                                    fill="#D9D8FF"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M69.278 103.123l-4.07.572a4 4 0 01-4.517-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404l.957 6.808"
                                    fill="#fff"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M71.805 98.712l-3.696.526a3.618 3.618 0 01-4.096-3.085l-9.996-71.925a3.646 3.646 0 013.097-4.108l71.038-10.096a3.619 3.619 0 014.097 3.085l.859 6.18 9.205 66.599c.306 2.212-1.22 4.257-3.408 4.566a4.192 4.192 0 01-.07.01l-67.03 8.248z"
                                    fill="#F0F0FF"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    d="M69.278 103.123l-4.07.572a4 4 0 01-4.517-3.404L49.557 21.069a4 4 0 013.404-4.518l78.231-10.994a4 4 0 014.518 3.404l.957 6.808M137.5 20.38l.5 3.12"
                                    stroke="#4945FF"
                                    stroke-linecap="round"
                                    stroke-opacity="0.83"
                                    stroke-width="2.5"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M164.411 30.299L85.844 22.04a2.74 2.74 0 00-2.018.598 2.741 2.741 0 00-1.004 1.85l-8.363 79.561c-.079.755.155 1.471.598 2.018a2.74 2.74 0 001.85 1.004l78.567 8.258a2.739 2.739 0 002.018-.598 2.741 2.741 0 001.005-1.849l8.362-79.562a2.743 2.743 0 00-.598-2.018 2.74 2.74 0 00-1.85-1.004z"
                                    fill="#fff"
                                    fill-rule="evenodd"
                                    stroke="#4945FF"
                                    stroke-opacity="0.83"
                                    stroke-width="2.5"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M92.99 30.585l62.655 6.585a3 3 0 012.67 3.297l-5.54 52.71a3 3 0 01-3.297 2.67L86.823 89.26a3 3 0 01-2.67-3.297l5.54-52.71a3 3 0 013.297-2.67z"
                                    fill="#fff"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M92.74 73.878l9.798-6.608a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l9.98 15.438 1.434 2.392-.687 8.124a1 1 0 01-1.08.913l-.026-.003-56.963-6.329a1 1 0 01-.886-1.085l.755-8.199 2.755-1.562z"
                                    fill="#F0F0FF"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M155.514 38.413l-62.655-6.585c-.48-.05-.936.098-1.284.38a1.744 1.744 0 00-.639 1.177l-5.54 52.71c-.05.48.099.936.38 1.284.282.348.697.589 1.178.64l62.654 6.585a1.746 1.746 0 001.924-1.558l5.54-52.71c.05-.48-.099-.936-.381-1.284a1.744 1.744 0 00-1.177-.639z"
                                    stroke="#4945FF"
                                    stroke-opacity="0.83"
                                    stroke-width="2.5"
                                  />
                                  <path
                                    d="M104.405 55.916a6 6 0 101.254-11.933 6 6 0 00-1.254 11.934z"
                                    fill="#F0F0FF"
                                    stroke="#4945FF"
                                    stroke-opacity="0.83"
                                    stroke-width="2.5"
                                  />
                                  <path
                                    d="M90.729 75.425l11.809-8.155a4 4 0 015.168.594l7.173 7.723a1 1 0 001.362.096l15.34-12.43a4 4 0 015.878.936l11.064 17.557"
                                    stroke="#4945FF"
                                    stroke-linecap="round"
                                    stroke-opacity="0.83"
                                    stroke-width="2.5"
                                  />
                                </g>
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        class="c30"
                      >
                        <div
                          class="c31"
                        >
                          <div
                            class=""
                          >
                            <h2
                              class="c32"
                              id="card-4-title"
                            >
                              https://www.w3schools.com/html/mov_bbb.mp4
                            </h2>
                            <div
                              class="c33"
                            >
                              <span
                                class="c49"
                              >
                                mp4
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="c0 c50"
        >
          <div
            class="c2"
          >
            <div
              class="c51 c52"
            >
              <button
                aria-disabled="false"
                class="c14 c53"
                type="button"
              >
                <span
                  class="c16 c17"
                />
              </button>
            </div>
            <div
              class="c51 c52"
            >
              <button
                aria-disabled="false"
                class="c14 c15"
                type="submit"
              >
                <span
                  class="c16 c17"
                >
                  Upload {number} asset to the library
                </span>
              </button>
            </div>
          </div>
        </div>
        <div
          class="c54"
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
