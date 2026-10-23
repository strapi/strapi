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
});
