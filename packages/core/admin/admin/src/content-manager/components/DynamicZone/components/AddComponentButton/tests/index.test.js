/**
 *
 * Tests for AddComponentButton
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import AddComponentButton from '../index';

describe('<AddComponentButton />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton label="test" name="name" onClick={jest.fn()} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
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

      .c1 svg {
        height: 12px;
        width: 12px;
      }

      .c1 svg > g,
      .c1 svg path {
        fill: #ffffff;
      }

      .c1[aria-disabled='true'] {
        pointer-events: none;
      }

      .c4 {
        padding-right: 8px;
      }

      .c0 {
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

      .c3 {
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

      .c9 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #8e8ea9;
      }

      .c10 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c7 > circle {
        fill: #eaeaef;
      }

      .c7 > path {
        fill: #666687;
      }

      .c2 {
        border-radius: 26px;
        background: #ffffff;
        padding: 12px;
        border: 0;
      }

      .c2:hover {
        color: #4945ff !important;
      }

      .c2:hover .c8 {
        color: #4945ff !important;
      }

      .c2:hover .c6 > circle {
        fill: #4945ff;
      }

      .c2:hover .c6 > path {
        fill: #f6f6f9;
      }

      .c2:active .c8 {
        color: #4945ff;
      }

      .c2:active .c6 > circle {
        fill: #4945ff;
      }

      .c2:active .c6 > path {
        fill: #f6f6f9;
      }

      .c2 svg {
        height: 24px;
        width: 24px;
      }

      .c5 {
        height: 100%;
      }

      <div
        class="c0"
      >
        <button
          aria-disabled="false"
          class="c1 c2"
          type="button"
        >
          <div
            class="c3"
          >
            <div
              aria-hidden="true"
              class="c4 c5"
            >
              <svg
                class="c6 c7"
                fill="none"
                height="1em"
                viewBox="0 0 24 24"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  fill="#212134"
                  r="12"
                />
                <path
                  d="M17 12.569c0 .124-.1.224-.225.224h-3.981v3.982c0 .124-.101.225-.226.225h-1.136a.225.225 0 01-.226-.225v-3.981H7.226A.225.225 0 017 12.567v-1.136c0-.125.1-.226.225-.226h3.982V7.226c0-.124.1-.225.224-.225h1.138c.124 0 .224.1.224.225v3.982h3.982c.124 0 .225.1.225.224v1.138z"
                  fill="#F6F6F9"
                />
              </svg>
            </div>
            <span
              class="c8 c9 c10"
            >
              Add a component to test
            </span>
          </div>
        </button>
      </div>
    `);
  });

  it('displays the name of the dz when the label is empty', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton label="" name="name" onClick={jest.fn()} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
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

      .c1 svg {
        height: 12px;
        width: 12px;
      }

      .c1 svg > g,
      .c1 svg path {
        fill: #ffffff;
      }

      .c1[aria-disabled='true'] {
        pointer-events: none;
      }

      .c4 {
        padding-right: 8px;
      }

      .c0 {
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

      .c3 {
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

      .c9 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #8e8ea9;
      }

      .c10 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c7 > circle {
        fill: #eaeaef;
      }

      .c7 > path {
        fill: #666687;
      }

      .c2 {
        border-radius: 26px;
        background: #ffffff;
        padding: 12px;
        border: 0;
      }

      .c2:hover {
        color: #4945ff !important;
      }

      .c2:hover .c8 {
        color: #4945ff !important;
      }

      .c2:hover .c6 > circle {
        fill: #4945ff;
      }

      .c2:hover .c6 > path {
        fill: #f6f6f9;
      }

      .c2:active .c8 {
        color: #4945ff;
      }

      .c2:active .c6 > circle {
        fill: #4945ff;
      }

      .c2:active .c6 > path {
        fill: #f6f6f9;
      }

      .c2 svg {
        height: 24px;
        width: 24px;
      }

      .c5 {
        height: 100%;
      }

      <div
        class="c0"
      >
        <button
          aria-disabled="false"
          class="c1 c2"
          type="button"
        >
          <div
            class="c3"
          >
            <div
              aria-hidden="true"
              class="c4 c5"
            >
              <svg
                class="c6 c7"
                fill="none"
                height="1em"
                viewBox="0 0 24 24"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  fill="#212134"
                  r="12"
                />
                <path
                  d="M17 12.569c0 .124-.1.224-.225.224h-3.981v3.982c0 .124-.101.225-.226.225h-1.136a.225.225 0 01-.226-.225v-3.981H7.226A.225.225 0 017 12.567v-1.136c0-.125.1-.226.225-.226h3.982V7.226c0-.124.1-.225.224-.225h1.138c.124 0 .224.1.224.225v3.982h3.982c.124 0 .225.1.225.224v1.138z"
                  fill="#F6F6F9"
                />
              </svg>
            </div>
            <span
              class="c8 c9 c10"
            >
              Add a component to name
            </span>
          </div>
        </button>
      </div>
    `);
  });
});
