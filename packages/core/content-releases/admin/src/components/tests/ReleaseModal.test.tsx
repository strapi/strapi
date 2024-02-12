import { within, fireEvent } from '@testing-library/react';
import { render, screen } from '@tests/utils';
import { MemoryRouter } from 'react-router-dom';

import { pluginId } from '../../pluginId';
import { ReleaseModal } from '../ReleaseModal';

describe('ReleaseModal', () => {
  it('renders correctly the dialog content on create', async () => {
    const handleCloseMocked = jest.fn();
    const { user } = render(
      <MemoryRouter initialEntries={[`/plugins/${pluginId}`]}>
        <ReleaseModal
          handleClose={handleCloseMocked}
          handleSubmit={jest.fn()}
          initialValues={{ name: '', date: null, time: '', timezone: '', scheduledAt: null }}
          isLoading={false}
        />
      </MemoryRouter>
    );
    const dialogContainer = screen.getByRole('dialog');
    const dialogCancelButton = within(dialogContainer).getByRole('button', {
      name: /cancel/i,
    });
    expect(dialogCancelButton).toBeInTheDocument();
    await user.click(dialogCancelButton);
    expect(handleCloseMocked).toHaveBeenCalledTimes(1);

    // the initial field value is empty
    const inputElement = within(dialogContainer).getByRole('textbox', { name: /name/i });
    expect(inputElement).toHaveValue('');

    // enable the submit button when there is content inside the input
    const dialogContinueButton = within(dialogContainer).getByRole('button', {
      name: /continue/i,
    });
    await user.type(inputElement, 'new release');
    expect(dialogContinueButton).toBeEnabled();
  });

  it('renders correctly the dialog content on update', async () => {
    const handleCloseMocked = jest.fn();
    const { user } = render(
      <ReleaseModal
        handleClose={handleCloseMocked}
        handleSubmit={jest.fn()}
        initialValues={{ name: 'title', date: null, time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );
    const dialogContainer = screen.getByRole('dialog');

    // the initial field value is the title
    const inputElement = within(dialogContainer).getByRole('textbox', { name: /name/i });
    expect(inputElement).toHaveValue('title');

    // disable the submit button when there are no changes inside the input
    const dialogSaveButton = within(dialogContainer).getByRole('button', {
      name: /save/i,
    });
    expect(dialogSaveButton).toBeDisabled();

    // change the input value and enable the submit button
    await user.type(inputElement, 'new content');
    expect(dialogSaveButton).toBeEnabled();

    // change the input to an empty value and disable the submit button
    await user.clear(inputElement);
    expect(dialogSaveButton).toBeDisabled();
  });

  it('should show scheduled fields when selecting schedule release', async () => {
    const handleCloseMocked = jest.fn();
    render(
      <ReleaseModal
        handleClose={handleCloseMocked}
        handleSubmit={jest.fn()}
        initialValues={{ name: 'title', date: null, time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );
    const dialogContainer = screen.getByRole('dialog');
    const scheduleReleaseCheck = within(dialogContainer).getByRole('checkbox', {
      name: /schedule release/i,
    });

    // Schedule release checkbox is not checked and date field is not visible
    expect(scheduleReleaseCheck).not.toBeChecked();
    const date = within(dialogContainer).queryByRole('combobox', {
      name: /date/i,
    });
    expect(date).not.toBeInTheDocument();

    // Click Schedule release checkbox
    fireEvent.click(scheduleReleaseCheck);
    expect(scheduleReleaseCheck).toBeChecked();

    // Date and other fields are visible
    const dateField = within(dialogContainer).queryByRole('combobox', {
      name: /date/i,
    });
    expect(dateField).toBeInTheDocument();

    const time = within(dialogContainer).getByRole('combobox', {
      name: /time\s/i,
    });
    expect(time).toBeInTheDocument();

    const timezone = within(dialogContainer).getByRole('combobox', {
      name: /timezone/i,
    });
    expect(timezone).toBeInTheDocument();
  });

  it('should update save button status when schedule release is selected', async () => {
    const handleCloseMocked = jest.fn();
    const { user } = render(
      <ReleaseModal
        handleClose={handleCloseMocked}
        handleSubmit={jest.fn()}
        initialValues={{ name: 'title', date: null, time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );
    const dialogContainer = screen.getByRole('dialog');
    const scheduleReleaseCheck = within(dialogContainer).getByRole('checkbox', {
      name: /schedule release/i,
    });
    // Click Schedule release checkbox
    fireEvent.click(scheduleReleaseCheck);
    expect(scheduleReleaseCheck).toBeChecked();

    const dialogSaveButton = within(dialogContainer).getByRole('button', {
      name: /save/i,
    });
    // save button is disabled initially
    expect(dialogSaveButton).toBeDisabled();

    const date = within(dialogContainer).queryByRole('combobox', {
      name: /date/i,
    });
    await user.click(date);
    await user.click(screen.getByRole('gridcell', { name: 'Sunday, March 3, 2024' }));

    const time = within(dialogContainer).getByRole('combobox', {
      name: 'Time *',
    });

    await user.click(time);
    await user.click(screen.getByRole('option', { name: '14:00' }));

    const timezone = within(dialogContainer).getByRole('combobox', {
      name: /timezone/i,
    });
    await user.click(timezone);
    await user.click(screen.getByRole('option', { name: 'GMT-11:00 - Midway, Niue, Pago Pago' }));

    // save button is enabled after filling all scheduling fields
    expect(dialogSaveButton).toBeEnabled();
  });
});
