import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { ListView } from '../ListView';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
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
    created_at: '2021-09-14T07:32:50.816Z',
    updated_at: '2021-09-14T07:32:50.816Z',
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
    created_at: '2021-09-14T07:48:30.882Z',
    updated_at: '2021-09-14T07:48:30.882Z',
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
    created_at: '2021-09-14T07:51:59.845Z',
    updated_at: '2021-09-14T07:51:59.845Z',
  },
];

describe('MediaLibrary / ListView', () => {
  it('snapshots the listview', () => {
    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <ListView assets={data} />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c29 {
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

      .c1 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c11 {
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

      .c23 {
        background: #32324d;
        color: #ffffff;
        padding: 4px;
        border-radius: 4px;
      }

      .c4 {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .c6 {
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

      .c12 {
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

      .c10 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
      }

      .c9 {
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

      .c13 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c14 {
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

      .c25 {
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

      .c18 {
        margin-left: auto;
      }

      .c5 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
      }

      .c5:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c5:checked:after {
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

      .c5:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c5:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c5:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c5:indeterminate:after {
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

      .c5:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c5:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c3 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c24 {
        position: absolute;
        bottom: 4px;
        right: 4px;
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

      .c15 {
        text-transform: uppercase;
      }

      .c22 canvas {
        display: block;
        max-width: 100%;
        max-height: 100%;
      }

      .c26 {
        text-transform: uppercase;
      }

      .c28 {
        text-transform: uppercase;
      }

      .c27 svg {
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
                  <input
                    aria-labelledby="card-1-title"
                    checked=""
                    class="c5"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c6"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-1"
                      class="c7 c8"
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
                  class="c9"
                >
                  <img
                    aria-hidden="true"
                    class="c10"
                    src="http://localhost:1337/uploads/thumbnail_strapi_cover_1fabc982ce_5b43615ed5.png"
                  />
                </div>
                 
              </div>
              <div
                class="c11"
              >
                <div
                  class="c12"
                >
                  <div
                    class=""
                  >
                    <h2
                      class="c13"
                      id="card-1-title"
                    >
                      strapi-cover_1fabc982ce.png
                    </h2>
                    <div
                      class="c14"
                    >
                      <span
                        class="c15"
                      >
                        png
                      </span>
                       - 
                      551
                      ✕
                      1066
                    </div>
                  </div>
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
                  <input
                    aria-labelledby="card-2-title"
                    checked=""
                    class="c5"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c6"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-3"
                      class="c7 c8"
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
                  class="c9"
                >
                  <div
                    class="c12"
                  >
                    <div
                      class="c22"
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
                  class="c23 c24"
                >
                  <span
                    class="c25"
                  >
                    ...
                  </span>
                </time>
              </div>
              <div
                class="c11"
              >
                <div
                  class="c12"
                >
                  <div
                    class=""
                  >
                    <h2
                      class="c13"
                      id="card-2-title"
                    >
                      mov_bbb.mp4
                    </h2>
                    <div
                      class="c14"
                    >
                      <span
                        class="c26"
                      >
                        mp4
                      </span>
                    </div>
                  </div>
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
                  <input
                    aria-labelledby="card-3-title"
                    checked=""
                    class="c5"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c6"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-5"
                      class="c7 c8"
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
                  class="c9"
                >
                  <div
                    class="c12"
                  >
                    <span
                      class="c27"
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
                class="c11"
              >
                <div
                  class="c12"
                >
                  <div
                    class=""
                  >
                    <h2
                      class="c13"
                      id="card-3-title"
                    >
                      CARTE MARIAGE AVS - Printemps.pdf
                    </h2>
                    <div
                      class="c14"
                    >
                      <span
                        class="c28"
                      >
                        pdf
                      </span>
                    </div>
                  </div>
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
            </article>
          </div>
        </div>
        <div
          class="c29"
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
