/**
 *
 * Tests for Input
 *
 */

import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { describe, it, expect, vi } from 'vitest';

import { Input } from '../Input';

const messages = {};

const makeApp = (
  name: string,
  type: string,
  value: string | boolean,
  props: Partial<React.ComponentProps<typeof Input>> = {}
) => (
  <IntlProvider locale="en" messages={messages} textComponent="span">
    <DesignSystemProvider>
      <Input
        intlLabel={{ id: 'enabled', defaultMessage: 'Enabled' }}
        name={name}
        onChange={vi.fn()}
        providerToEditName="email"
        type={type}
        value={value}
        {...props}
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

      .c1 {
        align-items: center;
        flex-direction: row;
        display: flex;
      }

      .c4 {
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        flex-direction: row;
        display: flex;
      }

      .c2 {
        font-size: 1.2rem;
        line-height: 1.33;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #32324d;
        font-weight: 600;
      }

      .c3 {
        display: block;
      }

      .c6 {
        border: none;
        border-radius: 4px;
        color: #32324d;
        font-weight: 400;
        font-size: 1.6rem;
        line-height: 2.4rem;
        display: block;
        width: 100%;
        background: inherit;
        padding-inline-start: 16px;
        padding-inline-end: 16px;
        padding-block: 12px;
      }

      .c6::placeholder {
        color: #666687;
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
        padding-inline-start: 0;
        position: relative;
        outline: none;
        box-shadow: none;
        transition-property: border-color,box-shadow,fill;
        transition-duration: 0.2s;
      }

      .c5:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      @media (min-width: 768px) {
        .c6 {
          font-size: 1.4rem;
          line-height: 2.2rem;
        }
      }

      @media (min-width: 768px) {
        .c6 {
          padding-block: 8px;
        }
      }

      <div
        class="c0"
      >
        <div
          class="c1"
        >
          <label
            class="c2 c3"
            for=":r0:"
            id=":r0:-label"
          >
            Enabled
          </label>
        </div>
        <div
          class="c4 c5"
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

    expect(getByLabelText('test')).toBeChecked();
  });
});

it('shows a read-only OAuth callback URL', () => {
  const { getByRole } = render(
    makeApp('redirectUri', 'text', 'https://cms.example.org/content/connect/discord/callback', {
      providerToEditName: 'discord',
      disabled: true,
    })
  );
  expect(getByRole('textbox', { name: 'Enabled' })).toHaveValue(
    'https://cms.example.org/content/connect/discord/callback'
  );
  expect(getByRole('textbox', { name: 'Enabled' })).toBeDisabled();
});

it('emits boolean values for a provider toggle', async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const { getByRole } = render(makeApp('enabled', 'bool', false, { onChange }));
  await user.click(getByRole('checkbox', { name: 'enabled' }));
  expect(onChange).toHaveBeenCalledWith({ target: { name: 'enabled', value: true } });
});

it('renders a translated placeholder and validation error', () => {
  const { getByRole, getByText } = render(
    makeApp('key', 'text', '', {
      error: 'Client ID is required',
      placeholder: {
        id: 'key.placeholder',
        defaultMessage: 'Client ID for {provider}',
        values: { provider: 'Discord' },
      },
    })
  );
  expect(getByRole('textbox', { name: 'Enabled' })).toHaveAttribute(
    'placeholder',
    'Client ID for Discord'
  );
  expect(getByRole('textbox', { name: 'Enabled' })).toHaveAttribute('aria-invalid', 'true');
  expect(getByText('Client ID is required')).toBeInTheDocument();
});
