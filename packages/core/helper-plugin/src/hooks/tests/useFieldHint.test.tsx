/* eslint-disable check-file/filename-naming-convention */ // this is disabled because the file name is correct however, we do use JSX in this file.
import * as React from 'react';

import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useFieldHint } from '../useFieldHint';

import type { UseFieldHintProps } from '../useFieldHint';

const messages = { 'message.id': 'response' };
const knownDescription = { id: 'message.id', defaultMessage: '' };

function setup(args: UseFieldHintProps) {
  return renderHook(() => useFieldHint(args), {
    wrapper: ({ children }) => (
      <IntlProvider locale="en" messages={messages} textComponent="span">
        {children}
      </IntlProvider>
    ),
  });
}

describe('useFieldHint', () => {
  describe('descriptions', () => {
    test('generates a known description', async () => {
      const { result } = setup({
        description: knownDescription,
      });

      expect(result.current.hint).toEqual('response');
    });

    test('fails to generate an unknown description', async () => {
      const { result } = setup({
        description: {},
      });

      expect(result.current.hint).toEqual('');
    });
  });

  describe('minimum/maximum limits', () => {
    test('generates a minimum limit', async () => {
      const minimum = 1;
      const fieldSchema = { min: minimum };

      const { result } = setup({
        fieldSchema,
      });

      const HintElement = result.current.hint as (string | React.JSX.Element)[];

      expect(HintElement.length).toEqual(3);

      expect(HintElement[0]).toEqual(`min. ${minimum} character`);
      expect(HintElement[2]).toEqual('');
    });

    test('generates a maximum limit', async () => {
      const maximum = 5;
      const fieldSchema = { max: maximum };

      const { result } = setup({
        fieldSchema,
      });

      const HintElement = result.current.hint as (string | React.JSX.Element)[];

      expect(HintElement.length).toEqual(3);

      expect(HintElement[0]).toEqual(`max. ${maximum} characters`);
      expect(HintElement[2]).toEqual('');
    });

    test('generates a minimum/maximum limits', async () => {
      const minimum = 1;
      const maximum = 5;
      const fieldSchema = { minLength: minimum, maxLength: maximum };

      const { result } = setup({
        fieldSchema,
      });

      const HintElement = result.current.hint as (string | React.JSX.Element)[];

      expect(HintElement.length).toEqual(3);

      expect(HintElement).toContain(`min. ${minimum} / max. ${maximum} characters`);
      expect(HintElement[2]).toEqual('');
    });
  });

  test('returns an empty string when there is no description or minimum and maximum limits', async () => {
    const { result } = setup({});

    expect(result.current.hint).toEqual('');
  });

  test('generates the description and min max hint', async () => {
    const minimum = 1;
    const maximum = 5;
    const fieldSchema = { minLength: minimum, maxLength: maximum };

    const { result } = setup({
      description: knownDescription,
      fieldSchema,
    });

    const HintElement = result.current.hint as (string | React.JSX.Element)[];

    expect(HintElement.length).toEqual(3);

    expect(HintElement[0]).toEqual(`min. ${minimum} / max. ${maximum} characters`);
    expect(HintElement[2]).toEqual('response');
  });
});
