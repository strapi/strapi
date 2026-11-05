/**
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import * as React from 'react';

import { Field } from '@strapi/design-system';
import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { ReleaseDateTimePicker, type ReleaseDateTimeValue } from '../ReleaseDateTimePicker';

/**
 * The picker as the release drawer uses it: in a field, its value held by the parent
 */
const Picker = ({
  initialValue,
  minDate,
  onChange = jest.fn(),
}: {
  initialValue: ReleaseDateTimeValue | null;
  minDate?: Date;
  onChange?: (value: ReleaseDateTimeValue | null) => void;
}) => {
  const [value, setValue] = React.useState(initialValue);

  return (
    <Field.Root name="date">
      <Field.Label>Release date</Field.Label>
      <ReleaseDateTimePicker
        date={value?.date ?? null}
        time={value?.time ?? ''}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        placeholder="Pick a date and time"
        clearLabel="Clear"
        minDate={minDate}
      />
    </Field.Root>
  );
};

describe('ReleaseDateTimePicker', () => {
  it("keeps a time that doesn't exist in the browser's zone, which isn't the release's", async () => {
    const onChange = jest.fn();
    // 02:30 on 29 March 2026 is in Paris' DST gap: a browser Date would read it 03:30
    const { user } = render(
      <Picker initialValue={{ date: '2026-03-29', time: '02:30' }} onChange={onChange} />
    );

    const trigger = screen.getByRole('combobox', { name: 'Release date' });
    expect(trigger).toHaveTextContent('Mar 29, 2026, 02:30');

    await user.click(trigger);
    await user.click(await screen.findByRole('button', { name: 'Monday, March 30, 2026' }));

    expect(onChange).toHaveBeenLastCalledWith({ date: '2026-03-30', time: '02:30' });
  });

  it('moves between days with the arrow keys, across months', async () => {
    const { user } = render(<Picker initialValue={{ date: '2026-03-31', time: '09:00' }} />);

    await user.click(screen.getByRole('combobox', { name: 'Release date' }));
    const selected = await screen.findByRole('button', { name: 'Tuesday, March 31, 2026' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    // The selected day is the grid's one tab stop
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Monday, March 30, 2026' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
    selected.focus();

    await user.keyboard('{ArrowRight}');

    const grid = screen.getByRole('group', { name: 'April 2026' });
    expect(within(grid).getByRole('button', { name: 'Wednesday, April 1, 2026' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('button', { name: 'Wednesday, March 25, 2026' })).toHaveFocus();
  });

  it("doesn't pick a day before the minimum date", async () => {
    const onChange = jest.fn();
    const { user } = render(
      <Picker
        initialValue={{ date: '2026-03-31', time: '09:00' }}
        minDate={new Date('2026-03-30T12:00:00')}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('combobox', { name: 'Release date' }));
    const past = await screen.findByRole('button', { name: 'Sunday, March 29, 2026' });
    expect(past).toHaveAttribute('aria-disabled', 'true');
    // The minimum date's own day stays available
    expect(screen.getByRole('button', { name: 'Monday, March 30, 2026' })).not.toHaveAttribute(
      'aria-disabled'
    );

    await user.click(past);

    expect(onChange).not.toHaveBeenCalled();
  });
});
