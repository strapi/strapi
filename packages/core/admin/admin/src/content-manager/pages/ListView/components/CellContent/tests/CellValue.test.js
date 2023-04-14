import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import CellValue from '../CellValue';

const CellValueWithProvider = (type, value) => {
  return (
    <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
      <CellValue type={type} value={value} />
    </IntlProvider>
  );
};

describe('CellValue', () => {
  it('should return a number with 4 decimals', () => {
    const { getByText } = render(CellValueWithProvider('decimal', 3.1415));

    expect(getByText('3.1415')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('decimal', 3));

    expect(getByText('3')).toBeInTheDocument();
  });

  it('should return a number with 11 decimals', () => {
    const { getByText } = render(CellValueWithProvider('float', 3.14159265359));

    expect(getByText('3.14159265359')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('float', 3));

    expect(getByText('3')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('integer', 3));

    expect(getByText('3')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('integer', 314159265359));

    expect(getByText('314,159,265,359')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 3));

    expect(getByText('3')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 314159265359));

    expect(getByText('314,159,265,359')).toBeInTheDocument();
  });
});
