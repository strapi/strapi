/**
 *
 * Tests for SearchAsset
 *
 */

import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import SearchAsset from '../index';

const handleChange = jest.fn();

const makeApp = (queryValue) => (
  <DesignSystemProvider>
    <IntlProvider locale="en">
      <SearchAsset onChangeSearch={handleChange} queryValue={queryValue} />
    </IntlProvider>
  </DesignSystemProvider>
);

describe('SearchAsset', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render(makeApp(null));

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        border-radius: 4px;
        display: inline-flex;
        cursor: pointer;
      }

      .c1 {
        align-items: center;
        justify-content: center;
        flex-direction: row;
        display: flex;
      }

      .c3 {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c2 {
        text-decoration: none;
        padding-block: 0.7rem;
        padding-inline: 0.7rem;
        border: 1px solid #dcdce4;
        background: #ffffff;
        color: #32324d;
        color: #8e8ea9;
      }

      .c2:hover {
        background-color: #f6f6f9;
        color: #666687;
      }

      .c2:active {
        background-color: #eaeaef;
      }

      .c2[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
        color: #666687;
        cursor: default;
      }

      @media (prefers-reduced-motion: no-preference) {
        .c2 {
          transition: background-color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94),color 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94),border-color 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      }

      <div>
        <button
          aria-disabled="false"
          class="c0 c1 c2"
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
              d="M29.061 26.939 23.125 21A11.515 11.515 0 1 0 21 23.125l5.941 5.942a1.503 1.503 0 0 0 2.125-2.125zM5.5 14a8.5 8.5 0 1 1 8.5 8.5A8.51 8.51 0 0 1 5.5 14"
            />
          </svg>
          <span
            class="c3"
          >
            Search
          </span>
        </button>
        <span
          class="c3"
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

  it('should set input value to queryValue if it exists', () => {
    const queryValue = 'michka';
    const { container } = render(makeApp(queryValue));

    const input = container.querySelector('input[name="search"]');

    expect(input).toBeInTheDocument();
    expect(input.value).toEqual(queryValue);
  });

  it('should call handleChange when submitting search input', () => {
    const { container } = render(makeApp(null));

    fireEvent.click(container.querySelector('button'));
    const input = container.querySelector('input[name="search"]');

    fireEvent.change(input, { target: { value: 'michka' } });
    fireEvent.submit(input);

    expect(handleChange.mock.calls.length).toBe(1);
  });
});
