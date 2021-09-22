import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { render as renderTL } from '@testing-library/react';
import { ImageAssetCard } from '../ImageAssetCard';
import en from '../../../translations/en.json';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('ImageAssetCard', () => {
  it('snapshots the component', () => {
    const { container } = renderTL(
      <ThemeProvider theme={lightTheme}>
        <ImageAssetCard
          name="hello.png"
          extension="png"
          height={40}
          width={40}
          thumbnail="http://somewhere.com/hello.png"
        />
      </ThemeProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c18 {
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

      .c5 {
        padding-top: 8px;
        padding-right: 12px;
        padding-bottom: 8px;
        padding-left: 12px;
      }

      .c12 {
        background: #f6f6f9;
        color: #666687;
        padding: 4px;
        border-radius: 4px;
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

      .c6 {
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

      .c4 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
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

      .c8 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c9 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c15 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c16 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c17 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c13 {
        display: inline-block;
      }

      .c11 {
        margin-left: auto;
      }

      .c14 {
        margin-left: 4px;
      }

      .c7 {
        word-break: break-all;
      }

      .c2 {
        position: relative;
        border-bottom: 1px solid #eaeaef;
      }

      .c10 {
        text-transform: uppercase;
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
              <img
                aria-hidden="true"
                class="c4"
                src="http://somewhere.com/hello.png"
              />
            </div>
          </div>
          <div
            class="c5"
          >
            <div
              class="c6"
            >
              <div
                class="c7"
              >
                <h2
                  class="c8"
                  id="card-1-title"
                >
                  hello.png
                </h2>
                <div
                  class="c9"
                >
                  <span
                    class="c10"
                  >
                    png
                  </span>
                  - 40✕40
                </div>
              </div>
              <div
                class="c11"
              >
                <div
                  class="c12 c13 c14"
                >
                  <span
                    class="c15 c16 c17"
                  >
                    Image
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <div
          class="c18"
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
