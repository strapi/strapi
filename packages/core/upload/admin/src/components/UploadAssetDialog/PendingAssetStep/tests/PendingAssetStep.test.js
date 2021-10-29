import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { PendingAssetStep } from '../PendingAssetStep';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

describe('PendingAssetStep', () => {
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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <PendingAssetStep
            assets={assets}
            onClose={jest.fn()}
            onAddAsset={jest.fn()}
            onClickAddAsset={jest.fn()}
            onCancelUpload={jest.fn()}
            onUploadSucceed={jest.fn()}
          />
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c50 {
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

      .c47 {
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
        position: relative;
        outline: none;
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

      .c5:after {
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

      .c5:focus-visible {
        outline: none;
      }

      .c5:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c6 {
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
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid #eaeaef;
      }

      .c46 {
        border-radius: 0 0 4px 4px;
        border-top: 1px solid #eaeaef;
      }

      .c48 > * + * {
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
        position: relative;
        outline: none;
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

      .c14:after {
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

      .c14:focus-visible {
        outline: none;
      }

      .c14:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c15 {
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

      .c15 .sc-dYzmtA {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
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

      .c49 {
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

      .c49 .sc-dYzmtA {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c49 .c16 {
        color: #ffffff;
      }

      .c49[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c49[aria-disabled='true'] .c16 {
        color: #666687;
      }

      .c49[aria-disabled='true'] svg > g,
      .c49[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c49[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c49[aria-disabled='true']:active .c16 {
        color: #666687;
      }

      .c49[aria-disabled='true']:active svg > g,
      .c49[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c49:hover {
        background-color: #f6f6f9;
      }

      .c49:active {
        background-color: #eaeaef;
      }

      .c49 .c16 {
        color: #32324d;
      }

      .c49 svg > g,
      .c49 svg path {
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
      }

      .c20 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c25 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c32 {
        background: #f6f6f9;
        padding: 4px;
        border-radius: 4px;
      }

      .c42 {
        background: #32324d;
        color: #ffffff;
        padding: 4px;
        border-radius: 4px;
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

      .c26 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c38 {
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

      .c24 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
      }

      .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 5.5rem;
        width: 100%;
        background: repeating-conic-gradient(#f6f6f9 0% 25%,transparent 0% 50%) 50% / 20px 20px;
      }

      .c28 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c29 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c35 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c44 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #ffffff;
      }

      .c36 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c37 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c33 {
        display: inline-block;
      }

      .c31 {
        margin-left: auto;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
      }

      .c34 {
        margin-left: 4px;
      }

      .c27 {
        word-break: break-all;
      }

      .c22 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c43 {
        position: absolute;
        bottom: 4px;
        right: 4px;
      }

      .c40 {
        text-transform: uppercase;
      }

      .c39 svg {
        font-size: 3rem;
      }

      .c30 {
        text-transform: uppercase;
      }

      .c41 canvas,
      .c41 video {
        display: block;
        max-width: 100%;
        max-height: 5.5rem;
      }

      .c45 {
        text-transform: uppercase;
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
        <form>
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
                            <img
                              aria-hidden="true"
                              class="c24"
                              src="http://localhost:5000/CPAM.jpg"
                            />
                          </div>
                        </div>
                        <div
                          class="c25"
                        >
                          <div
                            class="c26"
                          >
                            <div
                              class="c27"
                            >
                              <h2
                                class="c28"
                                id="card-1-title"
                              />
                              <div
                                class="c29"
                              >
                                <span
                                  class="c30"
                                >
                                  jpg
                                </span>
                              </div>
                            </div>
                            <div
                              class="c31"
                            >
                              <div
                                class="c32 c33 c34"
                              >
                                <span
                                  class="c35 c36 c37"
                                >
                                  Image
                                </span>
                              </div>
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
                            <div
                              class="c38"
                            >
                              <span
                                class="c39"
                              >
                                <svg
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
                          class="c25"
                        >
                          <div
                            class="c26"
                          >
                            <div
                              class="c27"
                            >
                              <h2
                                class="c28"
                                id="card-2-title"
                              />
                              <div
                                class="c29"
                              >
                                <span
                                  class="c40"
                                >
                                  pdf
                                </span>
                              </div>
                            </div>
                            <div
                              class="c31"
                            >
                              <div
                                class="c32 c33 c34"
                              >
                                <span
                                  class="c35 c36 c37"
                                >
                                  Doc
                                </span>
                              </div>
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
                            <div
                              class="c38"
                            >
                              <div
                                class="c41"
                              >
                                <video
                                  crossorigin="anonymous"
                                  src="http://localhost:5000/mov_bbb.mp4#t=1"
                                >
                                  <source
                                    type="video/mp4"
                                  />
                                </video>
                              </div>
                            </div>
                          </div>
                          <time
                            class="c42 c43"
                          >
                            <span
                              class="c44"
                            >
                              ...
                            </span>
                          </time>
                        </div>
                        <div
                          class="c25"
                        >
                          <div
                            class="c26"
                          >
                            <div
                              class="c27"
                            >
                              <h2
                                class="c28"
                                id="card-3-title"
                              />
                              <div
                                class="c29"
                              >
                                <span
                                  class="c45"
                                >
                                  mp4
                                </span>
                              </div>
                            </div>
                            <div
                              class="c31"
                            >
                              <div
                                class="c32 c33 c34"
                              >
                                <span
                                  class="c35 c36 c37"
                                >
                                  Video
                                </span>
                              </div>
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
                            <div
                              class="c38"
                            >
                              <span
                                class="c39"
                              >
                                <svg
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
                          class="c25"
                        >
                          <div
                            class="c26"
                          >
                            <div
                              class="c27"
                            >
                              <h2
                                class="c28"
                                id="card-4-title"
                              />
                              <div
                                class="c29"
                              >
                                <span
                                  class="c40"
                                >
                                  mp4
                                </span>
                              </div>
                            </div>
                            <div
                              class="c31"
                            >
                              <div
                                class="c32 c33 c34"
                              >
                                <span
                                  class="c35 c36 c37"
                                >
                                  Doc
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
            class="c0 c46"
          >
            <div
              class="c2"
            >
              <div
                class="c47 c48"
              >
                <button
                  aria-disabled="false"
                  class="c14 c49"
                  type="button"
                >
                  <span
                    class="c16 c17"
                  />
                </button>
              </div>
              <div
                class="c47 c48"
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
        </form>
        <div
          class="c50"
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
