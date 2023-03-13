/**
 *
 * Tests for InputIUD
 *
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import InputUID from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(() => ({
    modifiedData: {},
    initialData: {},
  })),
}));

describe('<InputUID />', () => {
  const props = {
    attribute: {
      required: false,
    },
    contentTypeUID: 'api::test.test',
    intlLabel: {
      id: 'test',
      defaultMessage: 'test',
    },
    name: 'test',
    onChange: jest.fn(),
    value: 'michka',
  };

  it('renders and matches the snapshot', async () => {
    const { container, getByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <InputUID {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText('test')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c6 {
        padding-right: 12px;
        padding-left: 8px;
      }

      .c8 {
        background: transparent;
        border-style: none;
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

      .c9 {
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
        -webkit-box-pack: unset;
        -webkit-justify-content: unset;
        -ms-flex-pack: unset;
        justify-content: unset;
      }

      .c1 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

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

      .c5 {
        border: none;
        border-radius: 4px;
        padding-bottom: 0.65625rem;
        padding-left: 16px;
        padding-right: 0;
        padding-top: 0.65625rem;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c5::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c5::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c5:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c5::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c5[aria-disabled='true'] {
        color: inherit;
      }

      .c5:focus {
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
      }

      .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c10 {
        font-size: 1.6rem;
        padding: 0;
      }

      .c7 {
        position: relative;
      }

      .c11 svg {
        height: 1rem;
        width: 1rem;
      }

      .c11 svg path {
        fill: #a5a5ba;
      }

      .c11 svg:hover path {
        fill: #4945ff;
      }

      .c13 {
        -webkit-animation: gzYjWD 2s infinite linear;
        animation: gzYjWD 2s infinite linear;
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
              for="1"
            >
              <div
                class="c2"
              >
                test
              </div>
            </label>
            <div
              class="c3 c4"
            >
              <input
                aria-disabled="false"
                aria-invalid="false"
                aria-required="false"
                class="c5"
                id="1"
                name="test"
                placeholder=""
                value="michka"
              />
              <div
                class="c6"
              >
                <div
                  class="c7"
                >
                  <button
                    class="c8 c9 c10 c11"
                    type="button"
                  >
                    <span
                      class="c12"
                    >
                      regenerate
                    </span>
                    <div
                      aria-hidden="true"
                      class="c2 c13"
                      focusable="false"
                    >
                      <svg
                        fill="none"
                        height="1rem"
                        viewBox="0 0 24 24"
                        width="1rem"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M12.057 18c.552 0 1 .451 1 .997v4.006a1 1 0 0 1-.941.995l-.059.002c-.552 0-1-.451-1-.997v-4.006a1 1 0 0 1 .941-.995l.06-.002Zm-3.06-.736.055.03c.478.276.64.89.367 1.364l-2.002 3.468a1 1 0 0 1-1.31.394l-.055-.03a1.002 1.002 0 0 1-.368-1.363l2.003-3.469a1 1 0 0 1 1.31-.394Zm7.42.394 2.002 3.468a1 1 0 0 1-.314 1.331l-.053.033a1.002 1.002 0 0 1-1.365-.363l-2.003-3.469a1 1 0 0 1 .314-1.33l.054-.034a1.002 1.002 0 0 1 1.364.364Zm-9.548-2.66.033.054c.276.478.11 1.091-.364 1.364L3.07 18.42a1 1 0 0 1-1.331-.314l-.033-.053a1.001 1.001 0 0 1 .364-1.365l3.468-2.003a1 1 0 0 1 1.33.314Zm11.79-.313 3.468 2.002a1 1 0 0 1 .393 1.31l-.03.055c-.276.478-.89.64-1.363.367l-3.469-2.003a1 1 0 0 1-.394-1.309l.03-.055c.276-.479.89-.64 1.364-.367Zm4.344-3.628a1 1 0 0 1 .995.941l.002.06c0 .551-.451 1-.997 1h-4.006a1 1 0 0 1-.995-.942L18 12.057c0-.552.451-1 .997-1h4.006Zm-18 0a1 1 0 0 1 .995.941l.002.06c0 .551-.451 1-.998 1H.998a1 1 0 0 1-.996-.942L0 12.057c0-.552.451-1 .998-1h4.004Zm17.454-5.059.033.054c.277.478.11 1.091-.363 1.365l-3.469 2.002a1 1 0 0 1-1.33-.314l-.034-.053a1.002 1.002 0 0 1 .364-1.365l3.468-2.003a1 1 0 0 1 1.331.314ZM3.07 5.684l3.468 2.003a1 1 0 0 1 .394 1.31l-.03.055c-.276.478-.89.64-1.364.367L2.07 7.417a1 1 0 0 1-.394-1.31l.03-.055c.276-.479.89-.64 1.364-.368Zm14.926-4.008.056.03c.478.276.64.89.367 1.364l-2.003 3.468a1 1 0 0 1-1.309.394l-.055-.03a1.002 1.002 0 0 1-.367-1.364l2.002-3.468a1 1 0 0 1 1.31-.394Zm-10.58.394L9.42 5.538a1 1 0 0 1-.314 1.33l-.053.034a1.002 1.002 0 0 1-1.365-.364L5.684 3.07a1 1 0 0 1 .314-1.331l.054-.033a1.002 1.002 0 0 1 1.365.364ZM12.058 0c.552 0 1 .451 1 .998v4.004a1 1 0 0 1-.941.996L12.057 6c-.552 0-1-.451-1-.998V.998a1 1 0 0 1 .941-.996l.06-.002Z"
                          fill="#212134"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  });
});
