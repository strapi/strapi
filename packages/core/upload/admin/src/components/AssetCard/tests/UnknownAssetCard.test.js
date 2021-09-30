import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { UnknownAssetCard } from '../UnknownAssetCard';
import en from '../../../translations/en.json';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('UnknownAssetCard', () => {
  it('snapshots the component', () => {
    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <UnknownAssetCard name="hello.png" extension="png" />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
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

      .c0 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c6 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c1 {
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

      .c7 {
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

      .c3 {
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

      .c9 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c10 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c8 {
        word-break: break-all;
      }

      .c2 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c11 {
        text-transform: uppercase;
      }

      .c5 svg {
        font-size: 3rem;
      }

      <div>
        <article
          aria-labelledby="card-1-title"
          class="c0"
          tabindex="0"
        >
          <div
            class="c1 c2"
          >
            <div
              class="c3"
            >
              <div
                class="c4"
              >
                <span
                  class="c5"
                >
                  <svg
                    aria-label="hello.png"
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
            class="c6"
          >
            <div
              class="c7"
            >
              <div
                class="c8"
              >
                <h2
                  class="c9"
                  id="card-1-title"
                >
                  hello.png
                </h2>
                <div
                  class="c10"
                >
                  <span
                    class="c11"
                  >
                    png
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <div
          class="c12"
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
