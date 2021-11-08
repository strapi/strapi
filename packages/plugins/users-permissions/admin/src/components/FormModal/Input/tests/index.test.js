/**
 *
 * Tests for Input
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Input from '../index';

const messages = {};

const makeApp = (name, type, value) => (
  <IntlProvider locale="en" messages={messages} textComponent="span">
    <ThemeProvider theme={lightTheme}>
      <Input
        intlLabel={{ id: 'enabled', defaultMessage: 'Enabled' }}
        name={name}
        onChange={jest.fn()}
        providerToEditName="email"
        type={type}
        value={value}
      />
    </ThemeProvider>
  </IntlProvider>
);

describe('<Input />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(makeApp('test', 'text', 'test'));

    expect(firstChild).toMatchInlineSnapshot(`
      .c2 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c1 {
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

      .c3 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c5 {
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
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
        background: inherit;
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
        height: 2.5rem;
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

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c0 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c0 > * + * {
        margin-top: 4px;
      }

      <div>
        <div>
          <div
            class="c0"
          >
            <div
              class="c1"
            >
              <label
                class="c2"
                for="textinput-1"
              >
                Enabled
              </label>
            </div>
            <div
              class="c3 c4"
            >
              <input
                aria-disabled="false"
                aria-invalid="false"
                aria-label="test"
                class="c5"
                id="textinput-1"
                name="test"
                placeholder=""
                type="text"
                value="test"
              />
            </div>
          </div>
        </div>
      </div>
    `);
  });

  it('should set the value correctly when the input\'s name is "noName"', () => {
    const { getByLabelText } = render(makeApp('noName', 'text', 'test'));

    expect(getByLabelText('noName').value).toBe(`${strapi.backendURL}/connect/email/callback`);
  });

  it('should display the toggleCheckbox correctly', () => {
    const { getByLabelText } = render(makeApp('test', 'bool', true));

    expect(getByLabelText('test').value).toBe('on');
  });
});
