import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssetList } from '..';
import en from '../../../translations/en.json';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x) => x,
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

describe('MediaLibrary / AssetList', () => {
  it('snapshots the asset list', () => {
    const { container } = renderTL(
      <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
          <AssetList assets={data} selectedAssets={[]} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(container).toMatchInlineSnapshot(`
      .c34 {
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

      .c14 {
        padding-top: 4px;
      }

      .c1 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c4 {
        position: start;
      }

      .c11 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c19 {
        background: #f6f6f9;
        padding: 4px;
        border-radius: 4px;
        min-width: 20px;
      }

      .c25 {
        background: #32324d;
        color: #ffffff;
        padding: 4px;
        border-radius: 4px;
      }

      .c2 {
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

      .c5 {
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

      .c12 {
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

      .c20 {
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

      .c6 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c6 > * + * {
        margin-left: 8px;
      }

      .c7 {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .c10 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
        object-fit: contain;
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

      .c15 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c16 {
        color: #666687;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c22 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c27 {
        color: #ffffff;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c18 {
        margin-left: auto;
        -webkit-flex-shrink: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
      }

      .c21 {
        margin-left: 4px;
      }

      .c8 {
        margin: 0;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        -webkit-appearance: none;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c8:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c8:checked:after {
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

      .c8:checked:disabled:after {
        background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
      }

      .c8:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c8:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c8:indeterminate:after {
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

      .c8:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c8:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c13 {
        word-break: break-all;
      }

      .c3 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c26 {
        position: absolute;
        bottom: 4px;
        right: 4px;
      }

      .c17 {
        text-transform: uppercase;
      }

      .c24 {
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

      .c28 {
        text-transform: uppercase;
      }

      .c23 canvas,
      .c23 video {
        display: block;
        max-width: 100%;
        max-height: 10.25rem;
      }

      .c29 {
        width: 100%;
        height: 10.25rem;
      }

      .c30 {
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

      .c33 {
        text-transform: uppercase;
      }

      .c32 svg {
        font-size: 3rem;
      }

      .c31 {
        border-radius: 4px 4px 0 0;
        background: linear-gradient(180deg,#ffffff 0%,#f6f6f9 121.48%);
      }

      .c0 {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
        grid-gap: 16px;
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
                  class="c4 c5 c6 c7"
                  spacing="2"
                >
                  <input
                    aria-labelledby="card-1-title"
                    class="c8"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c9"
                >
                  <img
                    alt="strapi-cover_1fabc982ce.png"
                    aria-hidden="true"
                    class="c10"
                    src="http://localhost:1337/uploads/thumbnail_strapi_cover_1fabc982ce_5b43615ed5.png?width=1066&height=551"
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
                    class="c13"
                  >
                    <div
                      class="c14"
                    >
                      <h2
                        class="c15"
                        id="card-1-title"
                      >
                        strapi-cover_1fabc982ce.png
                      </h2>
                    </div>
                    <div
                      class="c16"
                    >
                      <span
                        class="c17"
                      >
                        png
                      </span>
                       - 1066✕551
                    </div>
                  </div>
                  <div
                    class="c18"
                  >
                    <div
                      class="c19 c20 c21"
                    >
                      <span
                        class="c22"
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
                  class="c4 c5 c6 c7"
                  spacing="2"
                >
                  <input
                    aria-labelledby="card-2-title"
                    class="c8"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c9"
                >
                  <div
                    class="c5"
                  >
                    <div
                      class="c23"
                    >
                      <figure
                        class=""
                      >
                        <video
                          crossorigin="anonymous"
                          src="http://localhost:1337/uploads/mov_bbb_2f3907f7aa.mp4?updated_at=2021-09-14T07:48:30.882Z"
                        >
                          <source
                            type="video/mp4"
                          />
                        </video>
                        <figcaption
                          class="c24"
                        >
                          mov_bbb.mp4
                        </figcaption>
                      </figure>
                    </div>
                  </div>
                </div>
                <time
                  class="c25 c26"
                >
                  <span
                    class="c27"
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
                    class="c13"
                  >
                    <div
                      class="c14"
                    >
                      <h2
                        class="c15"
                        id="card-2-title"
                      >
                        mov_bbb.mp4
                      </h2>
                    </div>
                    <div
                      class="c16"
                    >
                      <span
                        class="c28"
                      >
                        mp4
                      </span>
                    </div>
                  </div>
                  <div
                    class="c18"
                  >
                    <div
                      class="c19 c20 c21"
                    >
                      <span
                        class="c22"
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
                  class="c4 c5 c6 c7"
                  spacing="2"
                >
                  <input
                    aria-labelledby="card-3-title"
                    class="c8"
                    type="checkbox"
                  />
                </div>
                <div
                  class="c29 c30 c31"
                  height="10.25rem"
                  width="100%"
                >
                  <span
                    class="c32"
                  >
                    <svg
                      aria-label="CARTE MARIAGE AVS - Printemps.pdf"
                      fill="none"
                      height="1em"
                      viewBox="0 0 24 33"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M23.305 8.126L16.39.749c-.443-.472-1.043-.741-1.643-.741H2.337c-.632 0-1.2.27-1.642.74A2.529 2.529 0 000 2.5v27.015c0 1.381 1.042 2.493 2.337 2.493h19.326c1.295 0 2.337-1.112 2.337-2.493V9.877c0-.64-.253-1.28-.695-1.751zm-1.326.606h-5.116c-.568 0-1.042-.505-1.042-1.112V2.197l6.158 6.535zm-.316 21.827H2.337c-.537 0-.98-.471-.98-1.044V2.5c0-.269.096-.538.285-.74a.949.949 0 01.695-.304h12.126V7.62c0 1.415 1.074 2.56 2.4 2.56h5.78v19.335c0 .573-.443 1.044-.98 1.044z"
                        fill="#D9822F"
                      />
                      <path
                        clip-rule="evenodd"
                        d="M13.964 20.095c.344.252.781.522 1.312.811a16.714 16.714 0 011.827-.1c1.53 0 2.451.236 2.764.709.166.212.177.463.031.753 0 .01-.005.02-.016.029l-.03.029v.014c-.063.367-.433.55-1.11.55-.5 0-1.098-.096-1.795-.29a11.908 11.908 0 01-2.03-.767c-2.3.232-4.341.633-6.121 1.202-1.593 2.53-2.852 3.795-3.779 3.795a.965.965 0 01-.437-.102l-.375-.174a1.668 1.668 0 00-.093-.072c-.105-.096-.136-.27-.094-.521.094-.386.385-.828.874-1.325.49-.498 1.177-.963 2.061-1.398.146-.087.266-.058.36.087.02.02.03.039.03.058a34.703 34.703 0 001.672-2.853c.707-1.313 1.249-2.578 1.623-3.794a10.952 10.952 0 01-.476-2.31c-.067-.748-.034-1.364.102-1.847.114-.386.333-.579.655-.579h.344c.24 0 .422.072.547.217.187.203.234.531.14.985a.307.307 0 01-.062.116.35.35 0 01.015.116v.434c-.02 1.188-.093 2.115-.218 2.78.572 1.584 1.332 2.733 2.28 3.447zM4.97 26.047c.542-.232 1.255-.995 2.14-2.289-.531.387-.987.792-1.367 1.217-.38.425-.637.782-.773 1.072zm6.183-11.412c-.135-.868-.125-1.506.032-1.911v-.03c.01-.009.015-.019.015-.028a.798.798 0 01.203.521c0 .01.005.024.016.044 0 .01.005.019.015.029a.317.317 0 00-.062.116c-.073.386-.11.593-.11.622l-.109.637zm-1.904 7.66a24.288 24.288 0 014.434-1.173 2.398 2.398 0 01-.203-.137 2.761 2.761 0 01-.25-.196c-.79-.647-1.452-1.496-1.983-2.549-.28.83-.713 1.782-1.296 2.854-.312.54-.546.94-.702 1.201zm7.9-.58c1.208 0 1.937.117 2.187.349.02.019.031.033.031.043-.042.01-.135.014-.281.014-.5 0-1.145-.135-1.936-.405z"
                        fill="#D9822F"
                        fill-rule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              </div>
              <div
                class="c11"
              >
                <div
                  class="c12"
                >
                  <div
                    class="c13"
                  >
                    <div
                      class="c14"
                    >
                      <h2
                        class="c15"
                        id="card-3-title"
                      >
                        CARTE MARIAGE AVS - Printemps.pdf
                      </h2>
                    </div>
                    <div
                      class="c16"
                    >
                      <span
                        class="c33"
                      >
                        pdf
                      </span>
                    </div>
                  </div>
                  <div
                    class="c18"
                  >
                    <div
                      class="c19 c20 c21"
                    >
                      <span
                        class="c22"
                      >
                        Doc
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <div
              aria-hidden="true"
            />
            <div
              aria-hidden="true"
            />
            <div
              aria-hidden="true"
            />
            <div
              aria-hidden="true"
            />
            <div
              aria-hidden="true"
            />
            <div
              aria-hidden="true"
            />
          </div>
        </div>
        <div
          class="c34"
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
