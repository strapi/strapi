/**
 *
 * Tests for SearchAsset
 *
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import SearchAsset from '../index';

const handleChange = jest.fn();

const makeApp = (queryValue) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en">
      <SearchAsset onChangeSearch={handleChange} queryValue={queryValue} />
    </IntlProvider>
  </ThemeProvider>
);

describe('<SearchURLQuery />', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render(makeApp(null));

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        background: #ffffff;
        padding: 8px;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
        width: 2rem;
        height: 2rem;
        cursor: pointer;
      }

      .c1 {
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

      .c2 {
        position: relative;
        outline: none;
      }

      .c2 > svg {
        height: 12px;
        width: 12px;
      }

      .c2 > svg > g,
      .c2 > svg path {
        fill: #ffffff;
      }

      .c2[aria-disabled='true'] {
        pointer-events: none;
      }

      .c2:after {
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

      .c4 {
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

      .c3 svg > g,
      .c3 svg path {
        fill: #8e8ea9;
      }

      .c3:hover svg > g,
      .c3:hover svg path {
        fill: #666687;
      }

      .c3:active svg > g,
      .c3:active svg path {
        fill: #a5a5ba;
      }

      .c3[aria-disabled='true'] svg path {
        fill: #666687;
      }

      <div>
        <span>
          <button
            aria-disabled="false"
            aria-labelledby="0"
            class="c0 c1 c2 c3"
            tabindex="0"
            type="button"
          >
            <span
              class="c4"
            >
              Search
            </span>
            <svg
              aria-hidden="true"
              fill="none"
              focusable="false"
              height="1rem"
              viewBox="0 0 24 24"
              width="1rem"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clip-rule="evenodd"
                d="m23.813 20.163-5.3-5.367a9.792 9.792 0 0 0 1.312-4.867C19.825 4.455 15.375 0 9.913 0 4.45 0 0 4.455 0 9.929c0 5.473 4.45 9.928 9.912 9.928a9.757 9.757 0 0 0 5.007-1.4l5.275 5.35a.634.634 0 0 0 .913 0l2.706-2.737a.641.641 0 0 0 0-.907ZM9.91 3.867c3.338 0 6.05 2.718 6.05 6.061s-2.712 6.061-6.05 6.061c-3.337 0-6.05-2.718-6.05-6.06 0-3.344 2.713-6.062 6.05-6.062Z"
                fill="#32324D"
                fill-rule="evenodd"
              />
            </svg>
          </button>
        </span>
        <div
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
        </div>
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
