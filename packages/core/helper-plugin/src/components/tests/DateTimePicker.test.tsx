import * as React from 'react';

import { DesignSystemProvider, DateTimePickerProps } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';

import { DateTimePicker } from '../DateTimePicker';

/**
 * DateTimePicker is deprecated and as such will fire a warning when rendered,
 * we therefore mock the console so we don't pollute the test output with warnings.
 */
jest.mock('../../utils/once', () => ({
  once: jest.fn(() => jest.fn()),
}));

const render = (props: Partial<DateTimePickerProps>) =>
  renderRTL(<DateTimePicker label="Date time picker" {...props} />, {
    wrapper: ({ children }) => (
      <DesignSystemProvider locale="en-GB">{children}</DesignSystemProvider>
    ),
  });

describe('DateTimePicker', () => {
  it('should initialize the two inputs', async () => {
    const { getByRole } = render({ value: new Date('2021-10-13T13:43:00.000Z') });

    expect(getByRole('combobox', { name: 'Choose time' })).toHaveValue('13:43');
    expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue('13/10/2021');
  });

  it('should rerender a new value passed as props', () => {
    const { rerender, getByRole } = render({ value: new Date('2021-10-13T13:43:00.000Z') });

    rerender(
      <DateTimePicker value={new Date('2021-10-04T13:00:00.000Z')} label="Date time picker" />
    );

    expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue('04/10/2021');
  });

  it('should rerender an empty value if it is passed as props', () => {
    const { rerender, getByRole } = render({ value: new Date('2021-10-13T13:43:00.000Z') });

    rerender(<DateTimePicker value={undefined} label="Date time picker" />);

    expect(getByRole('combobox', { name: 'Choose date' })).toHaveValue('');
  });
});
