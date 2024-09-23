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
      .c0 {
        gap: 4px;
        align-items: stretch;
        flex-direction: column;
        display: flex;
      }

      .c3 {
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        flex-direction: row;
        display: flex;
      }

      .c1 {
        font-size: 1.2rem;
        line-height: 1.33;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
        font-weight: 600;
      }

      .c2 {
        display: flex;
      }

      .c5 {
        border: none;
        border-radius: 4px;
        color: #32324d;
        font-weight: 400;
        font-size: 1.4rem;
        line-height: 2.2rem;
        display: block;
        width: 100%;
        background: inherit;
        padding-inline-start: 16px;
        padding-inline-end: 16px;
        padding-block: 8px;
      }

      .c5 ::placeholder {
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
        padding-inline-start: 0;
        position: relative;
        outline: none;
        box-shadow: none;
        transition-property: border-color,box-shadow,fill;
        transition-duration: 0.2s;
      }

      .c4:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      <div
        class="c0"
      >
        <label
          class="c1 c2"
          for=":r0:"
          id=":r0:-label"
        >
          Enabled
        </label>
        <div
          class="c3 c4"
        >
          <input
            aria-disabled="false"
            class="c5"
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
