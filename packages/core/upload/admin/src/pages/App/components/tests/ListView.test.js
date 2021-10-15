import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListView } from '../ListView';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

const data = [
  {
    id: 1,
    name: 'strapi-cover_1fabc982ce.png',
    alternativeText: '',
    caption: '',
    width: 1066,
    height: 551,
    formats: {
      thumbnail: {
        name: 'thumbnail_strapi-cover_1fabc982ce.png',
        hash: 'thumbnail_strapi_cover_1fabc982ce_5b43615ed5',
        ext: '.png',
        mime: 'image/png',
        width: 245,
        height: 127,
        size: 3.37,
        path: null,
        url: '/uploads/thumbnail_strapi_cover_1fabc982ce_5b43615ed5.png',
      },
      large: {
        name: 'large_strapi-cover_1fabc982ce.png',
        hash: 'large_strapi_cover_1fabc982ce_5b43615ed5',
        ext: '.png',
        mime: 'image/png',
        width: 1000,
        height: 517,
        size: 22.43,
        path: null,
        url: '/uploads/large_strapi_cover_1fabc982ce_5b43615ed5.png',
      },
      medium: {
        name: 'medium_strapi-cover_1fabc982ce.png',
        hash: 'medium_strapi_cover_1fabc982ce_5b43615ed5',
        ext: '.png',
        mime: 'image/png',
        width: 750,
        height: 388,
        size: 14.62,
        path: null,
        url: '/uploads/medium_strapi_cover_1fabc982ce_5b43615ed5.png',
      },
      small: {
        name: 'small_strapi-cover_1fabc982ce.png',
        hash: 'small_strapi_cover_1fabc982ce_5b43615ed5',
        ext: '.png',
        mime: 'image/png',
        width: 500,
        height: 258,
        size: 8.38,
        path: null,
        url: '/uploads/small_strapi_cover_1fabc982ce_5b43615ed5.png',
      },
    },
    hash: 'strapi_cover_1fabc982ce_5b43615ed5',
    ext: '.png',
    mime: 'image/png',
    size: 6.85,
    url: '/uploads/strapi_cover_1fabc982ce_5b43615ed5.png',
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    createdAt: '2021-09-14T07:32:50.816Z',
    updatedAt: '2021-09-14T07:32:50.816Z',
  },
  {
    id: 5,
    name: 'mov_bbb.mp4',
    alternativeText: '',
    caption: '',
    width: null,
    height: null,
    formats: null,
    hash: 'mov_bbb_2f3907f7aa',
    ext: '.mp4',
    mime: 'video/mp4',
    size: 788.49,
    url: '/uploads/mov_bbb_2f3907f7aa.mp4',
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    createdAt: '2021-09-14T07:48:30.882Z',
    updatedAt: '2021-09-14T07:48:30.882Z',
  },
  {
    id: 6,
    name: 'CARTE MARIAGE AVS - Printemps.pdf',
    alternativeText: '',
    caption: '',
    width: null,
    height: null,
    formats: null,
    hash: 'CARTE_MARIAGE_AVS_Printemps_1f87b19e18',
    ext: '.pdf',
    mime: 'application/pdf',
    size: 422.37,
    url: '/uploads/CARTE_MARIAGE_AVS_Printemps_1f87b19e18.pdf',
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    createdAt: '2021-09-14T07:51:59.845Z',
    updatedAt: '2021-09-14T07:51:59.845Z',
  },
];

describe('MediaLibrary / ListView', () => {
  it('snapshots the listview', () => {
    const { container } = renderTL(
      <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
          <ListView assets={data} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(container).toMatchInlineSnapshot(`
      .c30 {
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
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
        grid-gap: 16px;
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
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c9 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c16 {
        background: #f6f6f9;
        color: #666687;
        padding: 4px;
        border-radius: 4px;
      }

      .c24 {
        background: #32324d;
        color: #ffffff;
        padding: 4px;
        border-radius: 4px;
      }

      .c4 {
        position: absolute;
        top: 12px;
        right: 12px;
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

      .c10 {
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

      .c22 {
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
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
      }

      .c7 {
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

      .c19 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c26 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #ffffff;
      }

      .c20 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c21 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c17 {
        display: inline-block;
      }

      .c15 {
        margin-left: auto;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
      }

      .c18 {
        margin-left: 4px;
      }

      .c11 {
        word-break: break-all;
      }

      .c3 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c25 {
        position: absolute;
        bottom: 4px;
        right: 4px;
      }

      .c14 {
        text-transform: uppercase;
      }

      .c23 canvas {
        display: block;
        max-width: 100%;
        max-height: 10.25rem;
      }

      .c27 {
        text-transform: uppercase;
      }

      .c29 {
        text-transform: uppercase;
      }

      .c28 svg {
        font-size: 3rem;
      }

      <div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <article
              aria-labelledby="card-1-title"
              class="c1"
              tabindex="0"
            >
              <div
                class="c2 c3"
              >
                <div
                  class="c4"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-1"
                      class="c5 c6"
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
                  class="c7"
                >
                  <img
                    aria-hidden="true"
                    class="c8"
                    src="http://localhost:1337/uploads/thumbnail_strapi_cover_1fabc982ce_5b43615ed5.png?width=1066&height=551"
                  />
                </div>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10"
                >
                  <div
                    class="c11"
                  >
                    <h2
                      class="c12"
                      id="card-1-title"
                    >
                      strapi-cover_1fabc982ce.png
                    </h2>
                    <div
                      class="c13"
                    >
                      <span
                        class="c14"
                      >
                        png
                      </span>
                      - 551✕1066
                    </div>
                  </div>
                  <div
                    class="c15"
                  >
                    <div
                      class="c16 c17 c18"
                    >
                      <span
                        class="c19 c20 c21"
                      >
                        Image
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <article
              aria-labelledby="card-2-title"
              class="c1"
              tabindex="0"
            >
              <div
                class="c2 c3"
              >
                <div
                  class="c4"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-3"
                      class="c5 c6"
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
                  class="c7"
                >
                  <div
                    class="c22"
                  >
                    <div
                      class="c23"
                    >
                      <video
                        src="http://localhost:1337/uploads/mov_bbb_2f3907f7aa.mp4"
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
                  class="c24 c25"
                >
                  <span
                    class="c26"
                  >
                    ...
                  </span>
                </time>
              </div>
              <div
                class="c9"
              >
                <div
                  class="c10"
                >
                  <div
                    class="c11"
                  >
                    <h2
                      class="c12"
                      id="card-2-title"
                    >
                      mov_bbb.mp4
                    </h2>
                    <div
                      class="c13"
                    >
                      <span
                        class="c27"
                      >
                        mp4
                      </span>
                    </div>
                  </div>
                  <div
                    class="c15"
                  >
                    <div
                      class="c16 c17 c18"
                    >
                      <span
                        class="c19 c20 c21"
                      >
                        Video
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <article
              aria-labelledby="card-3-title"
              class="c1"
              tabindex="0"
            >
              <div
                class="c2 c3"
              >
                <div
                  class="c4"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-5"
                      class="c5 c6"
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
                  class="c7"
                >
                  <div
                    class="c22"
                  >
                    <span
                      class="c28"
                    >
                      <svg
                        aria-label="CARTE MARIAGE AVS - Printemps.pdf"
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
                class="c9"
              >
                <div
                  class="c10"
                >
                  <div
                    class="c11"
                  >
                    <h2
                      class="c12"
                      id="card-3-title"
                    >
                      CARTE MARIAGE AVS - Printemps.pdf
                    </h2>
                    <div
                      class="c13"
                    >
                      <span
                        class="c29"
                      >
                        pdf
                      </span>
                    </div>
                  </div>
                  <div
                    class="c15"
                  >
                    <div
                      class="c16 c17 c18"
                    >
                      <span
                        class="c19 c20 c21"
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
          class="c30"
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
