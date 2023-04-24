import * as React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import DateTimePicker from '../index';

describe('DateTimePicker', () => {
  it('snapshots the component', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          value={new Date('2021-10-13T10:00:00.000Z')}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should initialize the two inputs', () => {
    const { getByRole, getByText } = render(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          value={new Date('2021-10-13T13:43:00.000Z')}
          step={15}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    expect(getByText('13:45')).toBeInTheDocument();

    expect(getByRole('textbox', { name: 'Date time picker' })).toHaveValue('10/13/2021');
  });

  it('should rerender a new value passed as props', () => {
    const { rerender, getByRole } = render(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          value={new Date('2021-10-13T13:43:00.000Z')}
          step={15}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          value={new Date('2021-10-04T13:00:00.000Z')}
          step={15}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    expect(getByRole('textbox', { name: 'Date time picker' })).toHaveValue('10/4/2021');
  });

  it('should rerender an empty value if it is passed as props', () => {
    const { rerender, getByRole } = render(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          value={new Date('2021-10-13T13:43:00.000Z')}
          step={15}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={lightTheme}>
        <DateTimePicker
          step={15}
          onChange={() => {}}
          name="datetimepicker"
          label="Date time picker"
          hint="This is a super description"
        />
      </ThemeProvider>
    );

    expect(getByRole('textbox', { name: 'Date time picker' })).toHaveValue('');
  });
});
