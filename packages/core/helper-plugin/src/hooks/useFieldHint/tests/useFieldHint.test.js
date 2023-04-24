import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import useFieldHint from '../index';

const messages = { 'message.id': 'response' };
const knownDescription = { id: 'message.id', defaultMessage: '' };

// eslint-disable-next-line react/prop-types
export const IntlWrapper = ({ children }) => (
  <IntlProvider locale="en" messages={messages} textComponent="span">
    {children}
  </IntlProvider>
);

function setup(args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useFieldHint(args), { wrapper: IntlWrapper }));
    });
  });
}

describe('useFieldHint', () => {
  describe('descriptions', () => {
    test('generates a known description', async () => {
      const { result } = await setup({
        description: knownDescription,
      });

      expect(result.current.hint).toEqual('response');
    });

    test('fails to generate an unknown description', async () => {
      const { result } = await setup({
        description: {},
      });

      expect(result.current.hint).toEqual('');
    });
  });

  describe('minimum/maximum limits', () => {
    test('generates a minimum limit', async () => {
      const minimum = 1;
      const fieldSchema = { min: minimum };

      const { result } = await setup({
        fieldSchema,
      });

      expect(result.current.hint.length).toEqual(3);

      expect(result.current.hint[0]).toEqual(`min. ${minimum} character`);
      expect(result.current.hint[2]).toEqual('');
    });

    test('generates a maximum limit', async () => {
      const maximum = 5;
      const fieldSchema = { max: maximum };

      const { result } = await setup({
        fieldSchema,
      });

      expect(result.current.hint.length).toEqual(3);

      expect(result.current.hint[0]).toEqual(`max. ${maximum} characters`);
      expect(result.current.hint[2]).toEqual('');
    });

    test('generates a minimum/maximum limits', async () => {
      const minimum = 1;
      const maximum = 5;
      const fieldSchema = { minLength: minimum, maxLength: maximum };

      const { result } = await setup({
        fieldSchema,
      });

      expect(result.current.hint.length).toEqual(3);

      expect(result.current.hint).toContain(`min. ${minimum} / max. ${maximum} characters`);
      expect(result.current.hint[2]).toEqual('');
    });
  });

  test('returns an empty string when there is no description or minimum and maximum limits', async () => {
    const { result } = await setup({});

    expect(result.current.hint).toEqual('');
  });

  test('generates the description and min max hint', async () => {
    const minimum = 1;
    const maximum = 5;
    const fieldSchema = { minLength: minimum, maxLength: maximum };

    const { result } = await setup({
      description: knownDescription,
      fieldSchema,
    });

    expect(result.current.hint.length).toEqual(3);

    expect(result.current.hint[0]).toEqual(`min. ${minimum} / max. ${maximum} characters`);
    expect(result.current.hint[2]).toEqual('response');
  });
});
