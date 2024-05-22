import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';

import en from '../../../translations/en.json';
import { ImageAssetCard } from '../ImageAssetCard';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x) => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

describe('ImageAssetCard', () => {
  it('snapshots the component', () => {
    const { container } = renderTL(
      <DesignSystemProvider>
        <ImageAssetCard
          alt=""
          name="hello.png"
          extension="png"
          height={40}
          width={40}
          thumbnail="http://somewhere.com/hello.png"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          isUrlSigned={false}
        />
      </DesignSystemProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        background: #ffffff;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #eaeaef;
        box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1);
        height: 100%;
      }

      .c2 {
        position: relative;
      }

      .c11 {
        background: #ffffff;
        padding-block: 8px;
        padding-inline: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        cursor: pointer;
      }

      .c17 {
        padding-block-start: 8px;
        padding-inline-end: 12px;
        padding-block-end: 8px;
        padding-inline-start: 12px;
      }

      .c20 {
        padding-block-start: 4px;
      }

      .c24 {
        padding-block-start: 4px;
        flex-grow: 1;
      }

      .c27 {
        background: #eaeaef;
        padding-inline-end: 8px;
        padding-inline-start: 8px;
        min-width: 20px;
      }

      .c3 {
        align-items: center;
        display: flex;
        flex-direction: row;
        justify-content: center;
      }

      .c5 {
        align-items: center;
        display: flex;
        flex-direction: row;
        gap: 8px;
      }

      .c18 {
        align-items: flex-start;
        display: flex;
        flex-direction: row;
      }

      .c25 {
        align-items: center;
        display: flex;
        flex-direction: row;
      }

      .c28 {
        align-items: center;
        display: inline-flex;
        flex-direction: row;
        justify-content: center;
      }

      .c21 {
        font-size: 1.2rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c22 {
        font-size: 1.2rem;
        line-height: 1.33;
        color: #666687;
      }

      .c31 {
        font-weight: 600;
        font-size: 1.1rem;
        line-height: 1.45;
        text-transform: uppercase;
        line-height: 1rem;
        color: #666687;
      }

      .c14 {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c29 {
        border-radius: 4px;
        padding-block: 0.7rem;
      }

      .c12 {
        position: relative;
        outline: none;
      }

      .c12[aria-disabled='true'] {
        pointer-events: none;
      }

      .c12:after {
        transition-property: all;
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

      .c7 {
        min-width: 1.8rem;
        height: 1.8rem;
        margin: 0;
        appearance: none;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        background-color: #ffffff;
        cursor: pointer;
      }

      .c7:checked {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c7:checked:after {
        content: '';
        display: block;
        position: relative;
        background: url("data:image/svg+xml,%3csvg%20width='10'%20height='8'%20viewBox='0%200%2010%208'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M8.55323%200.396973C8.63135%200.316355%208.76051%200.315811%208.83931%200.395768L9.86256%201.43407C9.93893%201.51157%209.93935%201.6359%209.86349%201.7139L4.06401%207.67724C3.9859%207.75755%203.85707%207.75805%203.77834%207.67834L0.13866%203.99333C0.0617798%203.91549%200.0617102%203.79032%200.138504%203.7124L1.16213%202.67372C1.24038%202.59432%201.36843%202.59422%201.4468%202.67348L3.92174%205.17647L8.55323%200.396973Z'%20fill='white'%20/%3e%3c/svg%3e") no-repeat no-repeat center center;
        width: 1rem;
        height: 1rem;
        left: 50%;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
      }

      .c7:checked:disabled:after {
        background: url("data:image/svg+xml,%3csvg%20width='10'%20height='8'%20viewBox='0%200%2010%208'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M8.55323%200.396973C8.63135%200.316355%208.76051%200.315811%208.83931%200.395768L9.86256%201.43407C9.93893%201.51157%209.93935%201.6359%209.86349%201.7139L4.06401%207.67724C3.9859%207.75755%203.85707%207.75805%203.77834%207.67834L0.13866%203.99333C0.0617798%203.91549%200.0617102%203.79032%200.138504%203.7124L1.16213%202.67372C1.24038%202.59432%201.36843%202.59422%201.4468%202.67348L3.92174%205.17647L8.55323%200.396973Z'%20fill='%238E8EA9'%20/%3e%3c/svg%3e") no-repeat no-repeat center center;
      }

      .c7:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c7:indeterminate {
        background-color: #4945ff;
        border: 1px solid #4945ff;
      }

      .c7:indeterminate:after {
        content: '';
        display: block;
        position: relative;
        color: white;
        height: 2px;
        width: 10px;
        background-color: #ffffff;
        left: 50%;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
      }

      .c7:indeterminate:disabled {
        background-color: #dcdce4;
        border: 1px solid #c0c0cf;
      }

      .c7:indeterminate:disabled:after {
        background-color: #8e8ea9;
      }

      .c6 {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .c8 {
        position: absolute;
        top: 12px;
        right: 12px;
      }

      .c16 {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
        object-fit: contain;
      }

      .c15 {
        display: flex;
        justify-content: center;
        height: 16.4rem;
        width: 100%;
        background: repeating-conic-gradient(#f6f6f9 0% 25%, transparent 0% 50%) 50%/20px 20px;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
      }

      .c26 {
        margin-left: auto;
        flex-shrink: 0;
      }

      .c30 {
        margin-left: 4px;
      }

      .c19 {
        word-break: break-all;
      }

      .c4 {
        border-bottom: 1px solid #eaeaef;
      }

      .c13 {
        border-color: #dcdce4;
        height: 3.2rem;
        width: 3.2rem;
        color: #8e8ea9;
      }

      .c13:hover,
      .c13:focus {
        color: #666687;
      }

      .c13[aria-disabled='true'] {
        color: #666687;
      }

      .c23 {
        text-transform: uppercase;
      }

      .c10 {
        opacity: 0;
      }

      .c10:focus-within {
        opacity: 1;
      }

      .c1 {
        cursor: pointer;
      }

      .c1:hover .c9 {
        opacity: 1;
      }

      <div>
        <article
          aria-labelledby=":r0:-title"
          class="c0 c1"
          role="button"
          tabindex="-1"
        >
          <div
            class="c2 c3 c4"
          >
            <div>
              <div
                class="c5 c6"
              >
                <input
                  aria-labelledby=":r0:-title"
                  class="c7"
                  type="checkbox"
                />
              </div>
            </div>
            <div
              class="c5 c8 c9 c10"
            >
              <button
                aria-disabled="false"
                class="c11 c3 c12 c13"
                data-state="closed"
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="currentColor"
                  focusable="false"
                  height="16"
                  viewBox="0 0 32 32"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m28.414 9.171-5.585-5.586a2 2 0 0 0-2.829 0L4.586 19A1.98 1.98 0 0 0 4 20.414V26a2 2 0 0 0 2 2h5.586A1.98 1.98 0 0 0 13 27.414L28.414 12a2 2 0 0 0 0-2.829M24 13.585 18.414 8l3-3L27 10.585z"
                  />
                </svg>
                <span
                  class="c14"
                >
                  Edit
                </span>
              </button>
            </div>
            <div
              class="c15"
            >
              <img
                alt=""
                aria-hidden="true"
                class="c16"
                src="http://somewhere.com/hello.png"
              />
            </div>
          </div>
          <div
            class="c17"
          >
            <div
              class="c18"
            >
              <div
                class="c19"
              >
                <div
                  class="c20"
                >
                  <h2
                    class="c21"
                    id=":r0:-title"
                  >
                    hello.png
                  </h2>
                </div>
                <div
                  class="c22"
                >
                  <span
                    class="c23"
                  >
                    png
                  </span>
                   - 40✕40
                </div>
              </div>
              <div
                class="c24 c25"
              >
                <div
                  class="c26"
                >
                  <div
                    class="c27 c28 c29 c30"
                  >
                    <span
                      class="c31"
                    >
                      Image
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
        <span
          class="c14"
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
        </span>
      </div>
    `);
  });
});
