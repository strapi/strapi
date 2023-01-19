import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import useFieldHint from '../index';

const messages = { 'message.id': 'response' };
const knownDescription = { id: 'message.id', defaultMessage: '' };
const units = 'units';

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
        units,
      });

      expect(result.current.hint.length).toEqual(1);
      expect(result.current.hint).toContain('response');
    });

    test('fails to generate an unknown description', async () => {
      const { result } = await setup({
        description: {},
        units,
      });

      expect(result.current.hint).toEqual('');
    });
  });

  describe('minimum/maximum limits', () => {
    test('generates nothing if minimum and maximum are undefined', async () => {
      const { result } = await setup({
        units,
      });

      expect(result.current.hint).toEqual('');
    });

    test('generates a minimum limit', async () => {
      const minimum = 1;

      const { result } = await setup({
        minimum,
        units,
      });

      expect(result.current.hint.length).toEqual(3);

      expect(result.current.hint[0]).toEqual(`min. ${minimum}`);
      expect(result.current.hint[1]).toContain(` ${units}`);
      expect(result.current.hint[2]).toEqual(``);
    });

    test('generates a minimum/maximum limits', async () => {
      const maximum = 5;

      const { result } = await setup({
        maximum,
        units,
      });

      expect(result.current.hint.length).toEqual(3);

      expect(result.current.hint[0]).toEqual(`max. ${maximum}`);
      expect(result.current.hint[1]).toContain(` ${units}`);
      expect(result.current.hint[2]).toEqual('');
    });

    test('generates a minimum/maximum limits', async () => {
      const minimum = 1;
      const maximum = 5;

      const { result } = await setup({
        minimum,
        maximum,
        units,
      });

      expect(result.current.hint.length).toEqual(5);

      expect(result.current.hint).toContain(`min. ${minimum}`);
      expect(result.current.hint).toContain(`max. ${maximum}`);
      expect(result.current.hint[3]).toContain(` ${units}`);
      expect(result.current.hint[4]).toEqual('');
    });
  });

  test('returns an empty string when there is no description or minimum and maximum limits', async () => {
    const { result } = await setup({
      units,
    });

    expect(result.current.hint).toEqual('');
  });

  test('generates the description and min max hint', async () => {
    const minimum = 1;
    const maximum = 5;

    const { result } = await setup({
      description: knownDescription,
      minimum,
      maximum,
      units,
    });

    expect(result.current.hint.length).toEqual(5);

    expect(result.current.hint[0]).toEqual(`min. ${minimum}`);
    expect(result.current.hint[1]).toEqual(' / ');
    expect(result.current.hint[2]).toEqual(`max. ${maximum}`);
    expect(result.current.hint[3]).toContain(` ${units}`);
    expect(result.current.hint[4]).toEqual('response');
  });
});
