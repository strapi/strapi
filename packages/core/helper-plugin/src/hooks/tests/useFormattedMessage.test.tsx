/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { renderHook } from '@testing-library/react';
import { IntlProvider, MessageDescriptor } from 'react-intl';

import { useFormattedMessage } from '../useFormattedMessage';

const setup = (args: MessageDescriptor | string) => {
  return renderHook(() => useFormattedMessage(args), {
    wrapper({ children }) {
      return (
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          {children}
        </IntlProvider>
      );
    },
  });
};

describe('useFormatedMessage', () => {
  it('should return message when passed object with only id', () => {
    const message = {
      id: 'id only',
    };

    const { result } = setup(message);

    expect(result.current).toBe('id only');
  });

  it('should return message when passed object with id and default message', () => {
    const message = {
      id: 'object',
      defaultMessage: 'object',
    };

    const { result } = setup(message);

    expect(result.current).toBe('object');
  });

  it('should return message when passed string', () => {
    const { result } = setup('string');

    expect(result.current).toBe('string');
  });
});
