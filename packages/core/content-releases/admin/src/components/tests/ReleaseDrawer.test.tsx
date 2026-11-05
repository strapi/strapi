import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { ReleaseDrawer } from '../ReleaseDrawer';

const NEW_RELEASE = {
  name: '',
  isScheduled: true,
  scheduledAt: null,
  timezone: null,
  releaseCondition: 'all_or_nothing',
} as const;

const SCHEDULED_RELEASE = {
  name: 'Autumn campaign',
  isScheduled: true,
  // 09:30 in Paris
  scheduledAt: '2099-08-20T07:30:00.000Z',
  timezone: 'Europe/Paris',
  releaseCondition: 'allow_partial',
} as const;

const REQUIRED_ERROR = 'components.Input.error.validation.required';

const renderDrawer = (props: Partial<React.ComponentProps<typeof ReleaseDrawer>> = {}) =>
  render(
    <ReleaseDrawer
      open
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      title="Edit release"
      submitLabel="Save"
      initialValues={SCHEDULED_RELEASE}
      {...props}
    />
  );

// The date, time and timezone are picked in one popup, opened from this trigger
const getDateTrigger = () => screen.getByRole('combobox', { name: 'Release date', hidden: true });

const openPicker = async (user: ReturnType<typeof renderDrawer>['user']) => {
  await user.click(getDateTrigger());
  await screen.findByLabelText('Time');
};

describe('ReleaseDrawer', () => {
  it('closes on cancel', async () => {
    const onClose = jest.fn();
    const { user } = renderDrawer({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a press outside the drawer', async () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });
    const drawer = await screen.findByRole('dialog', { name: 'Edit release' });

    // Outside presses land on the drawer's full-screen viewport
    fireEvent.click(drawer.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a click is dispatched on the body', async () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });
    await screen.findByRole('dialog', { name: 'Edit release' });

    // Firefox fires this click after a legacy DS picker unmounts its portal on pointerdown
    fireEvent.click(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the release's schedule and release mode", async () => {
    const { user } = renderDrawer();

    expect(await screen.findByRole('dialog', { name: 'Edit release' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Release name' })).toHaveValue('Autumn campaign');
    // Paris is on summer time in August
    expect(getDateTrigger()).toHaveTextContent('Aug 20, 2099, 09:30 UTC+02:00');
    expect(screen.getByRole('radio', { name: 'Release all ready items' })).toBeChecked();

    await openPicker(user);

    expect(
      screen.getByRole('button', { name: 'Thursday, August 20, 2099', hidden: true })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Time')).toHaveValue('09:30');
    expect(screen.getByRole('combobox', { name: 'Timezone', hidden: true })).toHaveValue(
      'UTC+02:00 Europe/Paris'
    );
  });

  it('disables the schedule fields when the release has no date yet', async () => {
    const { user } = renderDrawer({
      initialValues: {
        ...SCHEDULED_RELEASE,
        isScheduled: false,
        scheduledAt: null,
        timezone: null,
      },
    });

    const noDate = screen.getByRole('checkbox', { name: "I don't have a release date yet" });
    expect(noDate).toBeChecked();
    expect(getDateTrigger()).toBeDisabled();

    await user.click(noDate);

    await waitFor(() => expect(getDateTrigger()).toBeEnabled());
    await openPicker(user);
    expect(screen.getByRole('combobox', { name: 'Timezone', hidden: true })).toBeEnabled();
  });

  it('leaves the date of a new release empty, also after ticking and unticking no date', async () => {
    const { user } = renderDrawer({ initialValues: NEW_RELEASE });

    await screen.findByRole('dialog', { name: 'Edit release' });
    expect(getDateTrigger()).toHaveTextContent('Pick a date and time');

    const noDate = screen.getByRole('checkbox', { name: "I don't have a release date yet" });
    await user.click(noDate);
    await user.click(noDate);

    await waitFor(() => expect(getDateTrigger()).toBeEnabled());
    expect(getDateTrigger()).toHaveTextContent('Pick a date and time');

    await openPicker(user);

    expect(screen.getByLabelText('Time')).toHaveValue('');
    expect(
      screen
        .getAllByRole('button', { hidden: true })
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
    ).toEqual([]);
  });

  it('keeps the schedule picked by the user after ticking and unticking no date', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });

    await openPicker(user);
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:00' } });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('Time')).not.toBeInTheDocument());

    const noDate = screen.getByRole('checkbox', { name: "I don't have a release date yet" });
    await user.click(noDate);
    await user.click(noDate);

    await waitFor(() => expect(getDateTrigger()).toBeEnabled());
    expect(getDateTrigger()).toHaveTextContent('Aug 20, 2099, 10:00 UTC+02:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // 10:00 in Paris
    expect(onSubmit.mock.calls[0][0].scheduledAt).toEqual(new Date('2099-08-20T08:00:00.000Z'));
  });

  it('submits without a date when a past schedule is disabled behind no date', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({
      onSubmit,
      initialValues: { ...SCHEDULED_RELEASE, scheduledAt: '2020-08-20T07:30:00.000Z' },
    });

    await user.click(screen.getByRole('checkbox', { name: "I don't have a release date yet" }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Autumn campaign',
      scheduledAt: null,
      timezone: null,
      releaseCondition: 'allow_partial',
    });
  });

  it('lists release all ready items first and checks the default mode', async () => {
    renderDrawer({ initialValues: NEW_RELEASE });

    const modes = await screen.findAllByRole('radio');

    expect(modes).toEqual([
      screen.getByRole('radio', { name: 'Release all ready items' }),
      screen.getByRole('radio', { name: 'Require every entry to be ready' }),
    ]);
    expect(modes[1]).toBeChecked();
  });

  it('submits the schedule in UTC with the timezone name', async () => {
    const onSubmit = jest.fn();
    renderDrawer({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Autumn campaign',
      scheduledAt: new Date('2099-08-20T07:30:00.000Z'),
      timezone: 'Europe/Paris',
      releaseCondition: 'allow_partial',
    });
  });

  it('submits a release without a date and the chosen release mode', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({
      onSubmit,
      title: 'New release',
      submitLabel: 'Create release',
      initialValues: NEW_RELEASE,
    });

    await user.type(screen.getByRole('textbox', { name: 'Release name' }), 'Winter campaign');
    await user.click(screen.getByRole('checkbox', { name: "I don't have a release date yet" }));
    await user.click(screen.getByRole('radio', { name: 'Release all ready items' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create release' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Winter campaign',
      scheduledAt: null,
      timezone: null,
      releaseCondition: 'allow_partial',
    });
  });

  it('requires a date and time for a scheduled release', async () => {
    const onSubmit = jest.fn();
    renderDrawer({ onSubmit, initialValues: { ...NEW_RELEASE, name: 'Winter campaign' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getDateTrigger()).toHaveAttribute('aria-invalid', 'true'));
    expect(getDateTrigger()).toHaveAccessibleDescription(REQUIRED_ERROR);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('leaves the timezone empty when the typed text matches no option', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });
    await openPicker(user);

    const timezone = screen.getByRole('combobox', { name: 'Timezone', hidden: true });
    await user.clear(timezone);
    await user.type(timezone, 'Paris');
    // The listbox is still open, which hides the rest of the drawer from the accessibility tree
    fireEvent.click(screen.getByRole('button', { name: 'Save', hidden: true }));

    // Only an option can be picked: the typed text leaves the field without a timezone. The error
    // shows under the picker's trigger, also once its popup is closed.
    await waitFor(() => expect(getDateTrigger()).toHaveAttribute('aria-invalid', 'true'));
    expect(getDateTrigger()).toHaveAccessibleDescription(REQUIRED_ERROR);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ReleaseDrawer keyboard and validation', () => {
  it.each([
    ['date', () => screen.getByRole('button', { name: 'Thursday, August 20, 2099', hidden: true })],
    ['time', () => screen.getByLabelText('Time')],
  ] as const)(
    'closes the open picker on Escape from its %s, not the drawer',
    async (_, getControl) => {
      const onClose = jest.fn();
      const { user } = renderDrawer({ onClose });
      await screen.findByRole('dialog', { name: 'Edit release' });

      await openPicker(user);
      getControl().focus();
      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByLabelText('Time')).not.toBeInTheDocument());
      expect(onClose).not.toHaveBeenCalled();

      // With no picker open, Escape closes the drawer
      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    }
  );

  it('closes the open timezone list on Escape, not the drawer', async () => {
    const onClose = jest.fn();
    const { user } = renderDrawer({ onClose });
    await screen.findByRole('dialog', { name: 'Edit release' });

    await openPicker(user);
    await user.click(screen.getByRole('button', { name: 'Show timezones', hidden: true }));
    expect(await screen.findByRole('listbox', { hidden: true })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('listbox', { hidden: true })).not.toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('on the day of the release', () => {
    beforeEach(() => {
      // 10:00 in Paris, half an hour after the release's time
      jest.useFakeTimers({ now: new Date('2099-08-20T08:00:00.000Z'), advanceTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears the time error once a later time is picked', async () => {
      const { user } = renderDrawer();

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(getDateTrigger()).toHaveAttribute('aria-invalid', 'true'));
      expect(getDateTrigger()).toHaveAccessibleDescription(
        'content-releases.modal.form.time.has-passed'
      );

      await openPicker(user);
      fireEvent.change(screen.getByLabelText('Time'), { target: { value: '11:00' } });

      await waitFor(() => expect(getDateTrigger()).toHaveAttribute('aria-invalid', 'false'));
    });
  });

  it('submits a time typed again after clearing the date and time', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });
    await openPicker(user);

    // The time row's Clear comes before the timezone's
    await user.click(screen.getAllByRole('button', { name: 'Clear', hidden: true })[0]);
    await user.click(
      screen.getByRole('button', { name: 'Thursday, August 20, 2099', hidden: true })
    );
    // A time input commits a whole time at once, which user-event can't type in jsdom
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:00' } });
    // Leaving the picker keeps what was typed
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('Time')).not.toBeInTheDocument());
    expect(getDateTrigger()).toHaveTextContent('Aug 20, 2099, 10:00 UTC+02:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // 10:00 in Paris
    expect(onSubmit.mock.calls[0][0].scheduledAt).toEqual(new Date('2099-08-20T08:00:00.000Z'));
  });

  it('keeps a cleared date and time cleared when the picker is left without picking one', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });
    await openPicker(user);

    // The time row's Clear comes before the timezone's
    await user.click(screen.getAllByRole('button', { name: 'Clear', hidden: true })[0]);
    expect(screen.getByLabelText('Time')).toHaveValue('');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('Time')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getDateTrigger()).toHaveAttribute('aria-invalid', 'true'));
    expect(getDateTrigger()).toHaveTextContent('Pick a date and time');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('selects the release mode with the arrow keys', async () => {
    const { user } = renderDrawer();
    const partial = screen.getByRole('radio', { name: 'Release all ready items' });
    const allOrNothing = screen.getByRole('radio', { name: 'Require every entry to be ready' });

    await user.click(partial);
    // A quick press: the key is released before the group moves the focus
    await user.keyboard('{ArrowDown}');

    await waitFor(() => expect(allOrNothing).toHaveFocus());
    expect(allOrNothing).toBeChecked();
  });
});
