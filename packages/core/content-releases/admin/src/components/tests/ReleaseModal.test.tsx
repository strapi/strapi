import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor } from '@tests/utils';

import { pluginId } from '../../pluginId';
import { ReleaseModal } from '../ReleaseModal';

describe('ReleaseModal', () => {
  beforeAll(() => {
    window.strapi.future = {
      isEnabled: () => true,
    };
  });

  afterAll(() => {
    window.strapi.future = {
      isEnabled: () => false,
    };
  });

  it('renders correctly the dialog content on create', async () => {
    const handleCloseMocked = jest.fn();
    const { user } = render(
      <ReleaseModal
        open
        handleClose={handleCloseMocked}
        handleSubmit={jest.fn()}
        initialValues={{ name: '', time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />,
      {
        initialEntries: [{ pathname: `/plugins/${pluginId}` }],
      }
    );
    const dialogCancelButton = screen.getByRole('button', {
      name: /cancel/i,
    });
    expect(dialogCancelButton).toBeInTheDocument();
    await user.click(dialogCancelButton);
    expect(handleCloseMocked).toHaveBeenCalledTimes(1);
  });

  it('should show scheduled fields when selecting schedule release', async () => {
    render(
      <ReleaseModal
        open
        handleClose={jest.fn()}
        handleSubmit={jest.fn()}
        initialValues={{ name: 'title', time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );
    const scheduleReleaseCheck = screen.getByRole('checkbox', {
      name: /schedule release/i,
    });

    // Schedule release checkbox is not checked and date field is not visible
    expect(scheduleReleaseCheck).not.toBeChecked();
    const date = screen.queryByRole('combobox', {
      name: /date/i,
    });
    expect(date).not.toBeInTheDocument();

    // Click Schedule release checkbox
    fireEvent.click(scheduleReleaseCheck);
    await waitFor(() => {
      expect(scheduleReleaseCheck).toBeChecked();
    });

    // Date and other fields are visible
    const dateField = await screen.findByRole('combobox', {
      name: /date/i,
    });
    expect(dateField).toBeInTheDocument();

    const time = await screen.findByRole('combobox', {
      name: 'Timezone',
    });
    expect(time).toBeInTheDocument();

    const timezone = await screen.findByRole('combobox', {
      name: /timezone/i,
    });
    expect(timezone).toBeInTheDocument();
  });

  it('closes on Escape without asking while the form is untouched', async () => {
    const handleClose = jest.fn();
    const { user } = render(
      <ReleaseModal
        open
        handleClose={handleClose}
        handleSubmit={jest.fn()}
        initialValues={{ name: '', time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );

    await user.keyboard('[Escape]');

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes without asking when an untouched scheduled release falls on a DST change day', async () => {
    const handleClose = jest.fn();
    const { user } = render(
      <ReleaseModal
        open
        handleClose={handleClose}
        handleSubmit={jest.fn()}
        initialValues={{
          name: 'Spring release',
          isScheduled: true,
          // Europe/Paris switches from UTC+01:00 to UTC+02:00 at 01:00 UTC on 2026-03-29,
          // so midnight UTC of `date` and `scheduledAt` sit on different offsets.
          date: '2026-03-29',
          time: '10:00',
          timezone: 'Europe/Paris',
          scheduledAt: new Date('2026-03-29T08:00:00.000Z'),
        }}
        isLoading={false}
      />
    );

    expect(await screen.findByRole('combobox', { name: /timezone/i })).toBeInTheDocument();

    await user.keyboard('[Escape]');

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks for confirmation before closing with unsaved changes', async () => {
    const handleClose = jest.fn();
    const { user } = render(
      <ReleaseModal
        open
        handleClose={handleClose}
        handleSubmit={jest.fn()}
        initialValues={{ name: '', time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'My release');
    await user.keyboard('[Escape]');

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.'
    );
    expect(handleClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(handleClose).toHaveBeenCalledTimes(1));
  });
});
