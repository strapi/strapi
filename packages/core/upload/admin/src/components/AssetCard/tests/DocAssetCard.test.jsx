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

      .c15 {
        width: 100%;
        height: 8.8rem;
      }

      .c18 {
        padding-block-start: 8px;
        padding-inline-end: 12px;
        padding-block-end: 8px;
        padding-inline-start: 12px;
      }

      .c21 {
        padding-block-start: 4px;
      }

      .c25 {
        padding-block-start: 4px;
        flex-grow: 1;
      }

      .c28 {
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

      .c19 {
        align-items: flex-start;
        display: flex;
        flex-direction: row;
      }

      .c26 {
        align-items: center;
        display: flex;
        flex-direction: row;
      }

      .c29 {
        align-items: center;
        display: inline-flex;
        flex-direction: row;
        justify-content: center;
      }

      .c22 {
        font-size: 1.2rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c23 {
        font-size: 1.2rem;
        line-height: 1.33;
        color: #666687;
      }

      .c32 {
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

      .c30 {
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

      .c27 {
        margin-left: auto;
        flex-shrink: 0;
      }

      .c31 {
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

      .c20 {
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

      .c24 {
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

      .c17 svg {
        font-size: 4.8rem;
      }

      .c16 {
        border-radius: 4px 4px 0 0;
        background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
      }

      @media (prefers-reduced-motion: no-preference) {
        .c7 {
          transition: border-color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94),background-color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
              class="c15 c3 c16"
            >
              <span
                class="c17"
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
            class="c18"
          >
            <div
              class="c19"
            >
              <div
                class="c20"
              >
                <div
                  class="c21"
                >
                  <h2
                    class="c22"
                    id=":r0:-title"
                  >
                    hello.png
                  </h2>
                </div>
                <div
                  class="c23"
                >
                  <span
                    class="c24"
                  >
                    png
                  </span>
                </div>
              </div>
              <div
                class="c25 c26"
              >
                <div
                  class="c27"
                >
                  <div
                    class="c28 c29 c30 c31"
                  >
                    <span
                      class="c32"
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
