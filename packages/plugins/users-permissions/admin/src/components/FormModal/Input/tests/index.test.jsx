/**
 *
 * Tests for Input
 *
 */

import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import Input from '../index';

const messages = {};

const makeApp = (name, type, value) => (
  <IntlProvider locale="en" messages={messages} textComponent="span">
    <DesignSystemProvider>
      <Input
        intlLabel={{ id: 'enabled', defaultMessage: 'Enabled' }}
        name={name}
        onChange={jest.fn()}
        providerToEditName="email"
        type={type}
        value={value}
      />
    </DesignSystemProvider>
  </IntlProvider>
);

describe('<Input />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(makeApp('test', 'text', 'test'));

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        display: flex;
      }

      .c3 {
        padding-block-start: 8px;
        padding-inline-end: 12px;
        padding-block-end: 8px;
        padding-inline-start: 12px;
      }

      .c0 {
        align-items: stretch;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .c4 {
        align-items: center;
        display: flex;
        flex-direction: row;
        gap: 8px;
        justify-content: space-between;
      }

      .c2 {
        font-size: 1.2rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c6 {
        border: none;
        border-radius: 4px;
        color: #32324d;
        font-weight: 400;
        font-size: 1.4rem;
        line-height: 2.2rem;
        display: block;
        width: 100%;
        background: inherit;
      }

      .c6 ::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c6[aria-disabled='true'] {
        color: inherit;
      }

      .c6:focus {
        outline: none;
        box-shadow: none;
      }

      .c5 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        outline: none;
        box-shadow: 0;
        transition-property: border-color,box-shadow,fill;
        transition-duration: 0.2s;
      }

      .c5:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      <div
        class="c0"
      >
        <label
          alignitems="center"
          class="c1 c2"
          for=":r0:"
          id=":r0:-label"
        >
          Enabled
        </label>
        <div
          class="c3 c4 c5"
        >
          <input
            aria-disabled="false"
            class="c6"
            id=":r0:"
            name="test"
            placeholder=""
            type="text"
            value="test"
          />
        </div>
      </div>
    `);
  });

  it('should display the toggleCheckbox correctly', () => {
    const { getByLabelText } = render(makeApp('test', 'bool', true));

    expect(getByLabelText('test').value).toBe('on');
  });
});
