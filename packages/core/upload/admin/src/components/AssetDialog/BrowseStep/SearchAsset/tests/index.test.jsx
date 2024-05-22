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
        background: #ffffff;
        padding-block: 8px;
        padding-inline: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        cursor: pointer;
      }

      .c1 {
        align-items: center;
        display: flex;
        flex-direction: row;
        justify-content: center;
      }

      .c4 {
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
        position: relative;
        outline: none;
      }

      .c2[aria-disabled='true'] {
        pointer-events: none;
      }

      .c2:after {
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

      .c2:focus-visible {
        outline: none;
      }

      .c2:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c3 {
        border-color: #dcdce4;
        height: 3.2rem;
        width: 3.2rem;
        color: #8e8ea9;
      }

      .c3:hover,
      .c3:focus {
        color: #666687;
      }

      .c3[aria-disabled='true'] {
        color: #666687;
      }

      <div>
        <button
          aria-disabled="false"
          class="c0 c1 c2 c3"
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
              d="M29.061 26.939 23.125 21A11.515 11.515 0 1 0 21 23.125l5.941 5.942a1.503 1.503 0 0 0 2.125-2.125zM5.5 14a8.5 8.5 0 1 1 8.5 8.5A8.51 8.51 0 0 1 5.5 14"
            />
          </svg>
          <span
            class="c4"
          >
            Search
          </span>
        </button>
        <span
          class="c4"
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

    fireEvent.click(container.querySelector('button[type="button"]'));
    const input = container.querySelector('input[name="search"]');

    fireEvent.change(input, { target: { value: 'michka' } });
    fireEvent.submit(input);

    expect(handleChange.mock.calls.length).toBe(1);
  });
});
