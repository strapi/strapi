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
    renderDrawer();

    expect(await screen.findByRole('dialog', { name: 'Edit release' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Release name' })).toHaveValue('Autumn campaign');
    expect(screen.getByRole('combobox', { name: 'Time' })).toHaveValue('09:30');
    // Paris is on summer time in August
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toHaveValue(
      'UTC+02:00 Europe/Paris'
    );
    expect(screen.getByRole('radio', { name: 'Release all ready items' })).toBeChecked();
  });

  it('hides the schedule fields when the release has no date yet', async () => {
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
    expect(screen.queryByRole('combobox', { name: 'Timezone' })).not.toBeInTheDocument();

    await user.click(noDate);

    expect(await screen.findByRole('combobox', { name: 'Timezone' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Date' })).toBeInTheDocument();
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

  it('requires a time for a scheduled release', async () => {
    const onSubmit = jest.fn();
    renderDrawer({ onSubmit, initialValues: { ...NEW_RELEASE, name: 'Winter campaign' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Time' })).toHaveAttribute('aria-invalid', 'true')
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a timezone that is not one of the options', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });

    const timezone = screen.getByRole('combobox', { name: 'Timezone' });
    await user.clear(timezone);
    await user.type(timezone, 'Paris');
    // The listbox is still open, which hides the rest of the drawer from the accessibility tree
    fireEvent.click(screen.getByRole('button', { name: 'Save', hidden: true }));

    await waitFor(() => expect(timezone).toHaveAttribute('aria-invalid', 'true'));
    expect(
      screen.getByText('components.Input.error.validation.combobox.invalid')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ReleaseDrawer keyboard and validation', () => {
  it.each([
    ['Date', 'dialog', 'Choose date'],
    ['Time', 'listbox', undefined],
    ['Timezone', 'listbox', undefined],
  ] as const)('closes an open %s picker on Escape, not the drawer', async (field, role, name) => {
    const onClose = jest.fn();
    const { user } = renderDrawer({ onClose });
    await screen.findByRole('dialog', { name: 'Edit release' });

    await user.click(screen.getByRole('combobox', { name: field }));
    expect(await screen.findByRole(role, { name, hidden: true })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole(role, { name, hidden: true })).not.toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();

    // With no picker open, Escape closes the drawer
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The release is in 2099: any time is in the future
  const clearTime = () => {
    const time = screen.getByRole('combobox', { name: 'Time' });
    // The first Clear after the time's input is its own
    const clear = screen
      .getAllByRole('button', { name: 'Clear' })
      .find((button) => time.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(clear as HTMLElement);
  };

  it('clears the time error once a time is picked', async () => {
    const { user } = renderDrawer();
    const time = screen.getByRole('combobox', { name: 'Time' });
    clearTime();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(time).toHaveAttribute('aria-invalid', 'true'));

    await user.click(time);
    await user.click(await screen.findByRole('option', { name: '10:00', hidden: true }));

    await waitFor(() => expect(time).toHaveAttribute('aria-invalid', 'false'));
  });

  it('submits a time typed again after clearing it', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });
    const time = screen.getByRole('combobox', { name: 'Time' });
    clearTime();
    await user.click(time);
    await user.click(await screen.findByRole('option', { name: '10:00', hidden: true }));
    clearTime();

    await user.type(time, '10:00');
    // Leaving the field keeps what was typed
    await user.click(screen.getByRole('textbox', { name: 'Release name', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // 10:00 in Paris
    expect(onSubmit.mock.calls[0][0].scheduledAt).toEqual(new Date('2099-08-20T08:00:00.000Z'));
  });

  it('keeps a cleared time cleared when the field is left without picking one', async () => {
    const onSubmit = jest.fn();
    const { user } = renderDrawer({ onSubmit });
    const time = screen.getByRole('combobox', { name: 'Time' });
    clearTime();

    await user.click(time);
    await user.click(screen.getByRole('textbox', { name: 'Release name', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(time).toHaveAttribute('aria-invalid', 'true'));
    expect(time).toHaveValue('');
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
