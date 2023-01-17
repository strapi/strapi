import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';

import useFieldHint from '../index';

const messages = { 'message.id': 'response' };
const description = { id: 'message.id', defaultMessage: '' };
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
  test('correctly generates the description', async () => {
    const minimum = 1;
    const maximum = 5;

    const { result } = await setup({
      description,
      minimum,
      maximum,
      units,
    });

    expect(result.current.hint).toContain(`min. ${minimum} / max. ${maximum} ${units}`);
    expect(result.current.hint).toContain('response');
  });
});
