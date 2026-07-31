import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { CellValue, CellValueProps } from '../CellValue';

const CellValueWithProvider = (
  type: CellValueProps['type'],
  value: CellValueProps['value'],
  isIdColumn?: CellValueProps['isIdColumn']
) => {
  return (
    <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
      <CellValue isIdColumn={isIdColumn} type={type} value={value} />
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

  it('should return a large integer with thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('integer', 314159265359));

    expect(getByText('314,159,265,359')).toBeInTheDocument();
  });

  it('should return a very large integer with thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('integer', 1000000000000));

    expect(getByText('1,000,000,000,000')).toBeInTheDocument();
  });

  it('should return an ID column integer without thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('integer', 1000000000000, true));

    expect(getByText('1000000000000')).toBeInTheDocument();
  });

  it('should return a number with 0 decimals', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 3));

    expect(getByText('3')).toBeInTheDocument();
  });

  it('should return a large biginteger with thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 314159265359));

    expect(getByText('314,159,265,359')).toBeInTheDocument();
  });

  it('should return a very large biginteger with thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 1000000000000));

    expect(getByText('1,000,000,000,000')).toBeInTheDocument();
  });

  it('should return an ID column biginteger without thousands separator', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', 1000000000000, true));

    expect(getByText('1000000000000')).toBeInTheDocument();
  });

  it('should return a biginteger string without losing precision', () => {
    const { getByText } = render(CellValueWithProvider('biginteger', '900719925474099312345'));

    expect(getByText('900,719,925,474,099,312,345')).toBeInTheDocument();
  });

  it('should return an ID column biginteger string without losing precision', () => {
    const { getByText } = render(
      CellValueWithProvider('biginteger', '900719925474099312345', true)
    );

    expect(getByText('900719925474099312345')).toBeInTheDocument();
  });

  it('should format a date value (string) as a full date', () => {
    const { getByText } = render(CellValueWithProvider('date', '2024-01-15'));

    expect(getByText(/January 15, 2024/)).toBeInTheDocument();
  });

  it('should format a datetime value as a full date and short time', () => {
    const { getByText } = render(CellValueWithProvider('datetime', '2024-01-15T09:30:00.000Z'));

    expect(getByText(/January 15, 2024/)).toBeInTheDocument();
  });

  it('should format a time value (HH:mm:ss string) as a short time', () => {
    const { getByText } = render(CellValueWithProvider('time', '14:30:00'));

    expect(getByText(/2:30/)).toBeInTheDocument();
  });

  it('should render the on-label for a truthy boolean', () => {
    const { getByText } = render(CellValueWithProvider('boolean', true));

    expect(getByText('true')).toBeInTheDocument();
  });

  it('should render the off-label for a falsy boolean', () => {
    const { getByText } = render(CellValueWithProvider('boolean', false));

    expect(getByText('false')).toBeInTheDocument();
  });
});
