import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';

import en from '../../../translations/en.json';
import { DocAssetCard } from '../DocAssetCard';

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
      <DesignSystemProvider>
        <DocAssetCard
          name="hello.png"
          extension="png"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </DesignSystemProvider>
    );

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        height: 100%;
        background: #ffffff;
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #eaeaef;
        box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1);
      }

      .c2 {
        position: relative;
      }

      .c11 {
        border-radius: 4px;
        display: inline-flex;
        cursor: pointer;
      }

      .c14 {
        width: 100%;
        height: 8.8rem;
      }

      .c17 {
        padding-block-start: 8px;
        padding-block-end: 8px;
        padding-inline-start: 12px;
        padding-inline-end: 12px;
      }

      .c20 {
        padding-block-start: 4px;
      }

      .c24 {
        padding-block-start: 4px;
        flex-grow: 1;
      }

      .c27 {
        padding-inline-start: 8px;
        padding-inline-end: 8px;
        min-width: 20px;
        background: #eaeaef;
      }

      .c3 {
        align-items: center;
        justify-content: center;
        flex-direction: row;
        display: flex;
      }

      .c5 {
        gap: 8px;
        align-items: center;
        flex-direction: row;
        display: flex;
      }

      .c18 {
        align-items: flex-start;
        flex-direction: row;
        display: flex;
      }

      .c25 {
        align-items: center;
        flex-direction: row;
        display: flex;
      }

      .c28 {
        align-items: center;
        justify-content: center;
        flex-direction: row;
        display: inline-flex;
      }

      .c21 {
        font-size: 1.2rem;
        line-height: 1.33;
        color: #32324d;
        font-weight: 600;
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
        color: #666687;
        line-height: 1rem;
      }

      .c13 {
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
        text-decoration: none;
        padding-block: 0.7rem;
        padding-inline: 0.7rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
        color: #32324d;
        color: #8e8ea9;
      }

      .c12:hover {
        background-color: #f6f6f9;
        color: #666687;
      }

      .c12:active {
        background-color: #eaeaef;
      }

      .c12[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
        color: #666687;
        cursor: default;
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

      .c26 {
        margin-left: auto;
        flex-shrink: 0;
      }

      .c30 {
        margin-left: 4px;
      }

      .c7 {
        background: #ffffff;
        width: 2rem;
        height: 2rem;
        border-radius: 4px;
        border: 1px solid #c0c0cf;
        position: relative;
        z-index: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 0 0 2rem;
      }

      .c7[data-state='checked'],
      .c7[data-state='indeterminate'] {
        border: 1px solid #4945ff;
        background-color: #4945ff;
      }

      .c7[data-disabled] {
        background-color: #dcdce4;
      }

      .c7::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        min-width: 44px;
        min-height: 44px;
      }

      .c19 {
        word-break: break-all;
      }

      .c4 {
        border-bottom: 1px solid #eaeaef;
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

      .c16 svg {
        font-size: 4.8rem;
      }

      .c15 {
        border-radius: 4px 4px 0 0;
        background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
      }

      @media (prefers-reduced-motion: no-preference) {
        .c12 {
          transition: background-color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94),color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94),border-color 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
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
                <button
                  aria-checked="false"
                  aria-labelledby=":r0:-title"
                  class="c7"
                  data-state="unchecked"
                  role="checkbox"
                  type="button"
                  value="on"
                />
              </div>
            </div>
            <div
              class="c5 c8 c9 c10"
            >
              <button
                aria-disabled="false"
                class="c11 c3 c12"
                data-state="closed"
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
                  class="c13"
                >
                  Edit
                </span>
              </button>
            </div>
            <div
              class="c14 c3 c15"
            >
              <span
                class="c16"
              >
                <svg
                  aria-label="hello.png"
                  fill="currentColor"
                  height="16"
                  viewBox="0 0 32 32"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m26.708 10.293-7-7A1 1 0 0 0 19 3H7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V11a1 1 0 0 0-.293-.707M19 11V5.5l5.5 5.5z"
                  />
                </svg>
              </span>
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
                      Doc
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
        <span
          class="c13"
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
