import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import useFieldHint from '../index';

const messages = { 'message.id': 'response' };
const description = { id: 'message.id', defaultMessage: '' };

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
  describe('correctly generates the description', () => {
    const minimum = 1;
    const maximum = 5;

    test('as a character limit', async () => {
      const { result } = await setup({
        description,
        minimum,
        maximum,
      });

      expect(result.current.fieldHint).toContain('min. 1 / max. 5 characters');
      expect(result.current.fieldHint).toContain('response');
    });

    test('as a number limit', async () => {
      const { result } = await setup({
        description,
        minimum,
        maximum,
        isNumber: true,
      });

      expect(result.current.fieldHint).toContain(`min. ${minimum} / max. ${maximum}`);
      expect(result.current.fieldHint).toContain('response');
    });
  });

  test('ignores 0 minimum values', async () => {
    const minimum = 0;
    const maximum = 2;
    const { result } = await setup({
      description,
      minimum,
      maximum,
    });

    expect(result.current.fieldHint).toContain(`max. ${maximum} characters`);
    expect(result.current.fieldHint).toContain('response');
  });

  describe('handles plurals correctly', () => {
    const minimum = undefined;
    const maximum = 1;
    test('maximum', async () => {
      const { result } = await setup({
        description,
        minimum,
        maximum,
      });

      expect(result.current.fieldHint).toContain(`max. ${maximum} character`);
      expect(result.current.fieldHint).toContain('response');
    });

    test('minimum', async () => {
      const minimum = 1;
      const maximum = undefined;
      const { result } = await setup({
        description,
        minimum,
        maximum,
      });

      expect(result.current.fieldHint).toContain(`min. ${minimum} character`);
      expect(result.current.fieldHint).toContain('response');
    });
  });
});
