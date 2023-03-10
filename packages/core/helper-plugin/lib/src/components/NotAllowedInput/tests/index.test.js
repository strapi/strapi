/**
 *
 * Tests for NotAllowedInput
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import NotAllowedInput from '../index';

const messages = {
  'components.NotAllowedInput.text': 'No permissions to see this field',
};

describe('<NotAllowedInput />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <NotAllowedInput name="test" intlLabel={{ id: 'test', defaultMessage: 'test' }} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c5 {
        padding-right: 8px;
        padding-left: 12px;
      }

      .c0 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        gap: 4px;
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
      }

      .c3 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c1 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c7 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 0;
        padding-right: 16px;
        padding-top: 0.65625rem;
        cursor: not-allowed;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c7::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c7::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c7:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c7::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c7[aria-disabled='true'] {
        color: inherit;
      }

      .c7:focus {
        outline: none;
        box-shadow: none;
      }

      .c4 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        color: #666687;
        background: #eaeaef;
      }

      .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c6 > path {
        fill: #666687;
      }

      <div>
        <div
          class=""
        >
          <div
            class="c0"
          >
            <label
              class="c1"
              for="test"
            >
              <div
                class="c2"
              >
                test
              </div>
            </label>
            <div
              class="c3 c4"
              disabled=""
            >
              <div
                class="c5"
              >
                <svg
                  class="c6"
                  fill="none"
                  height="1rem"
                  viewBox="0 0 24 24"
                  width="1rem"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.048 6.875 2.103 4.93a1 1 0 1 1 1.414-1.415l16.966 16.966a1 1 0 1 1-1.414 1.415l-2.686-2.686a12.247 12.247 0 0 1-4.383.788c-3.573 0-6.559-1.425-8.962-3.783a15.842 15.842 0 0 1-2.116-2.568 11.096 11.096 0 0 1-.711-1.211 1.145 1.145 0 0 1 0-.875c.124-.258.36-.68.711-1.211.58-.876 1.283-1.75 2.116-2.569.326-.32.663-.622 1.01-.906Zm10.539 10.539-1.551-1.551a4.005 4.005 0 0 1-4.9-4.9L6.584 9.411a6 6 0 0 0 8.002 8.002ZM7.617 4.787A12.248 12.248 0 0 1 12 3.998c3.572 0 6.559 1.426 8.961 3.783a15.845 15.845 0 0 1 2.117 2.569c.351.532.587.954.711 1.211.116.242.115.636 0 .875-.124.257-.36.68-.711 1.211-.58.876-1.283 1.75-2.117 2.568-.325.32-.662.623-1.01.907l-2.536-2.537a6 6 0 0 0-8.002-8.002L7.617 4.787Zm3.347 3.347A4.005 4.005 0 0 1 16 11.998c0 .359-.047.706-.136 1.037l-4.9-4.901Z"
                    fill="#212134"
                  />
                </svg>
              </div>
              <input
                aria-disabled="true"
                aria-invalid="false"
                aria-required="false"
                class="c7"
                data-disabled=""
                disabled=""
                id="test"
                name="test"
                placeholder="No permissions to see this field"
                type="text"
                value=""
              />
            </div>
          </div>
        </div>
      </div>
    `);
  });
});
