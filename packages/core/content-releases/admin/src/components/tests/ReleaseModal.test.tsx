import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor } from '@tests/utils';
import { MemoryRouter } from 'react-router-dom';

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
      <MemoryRouter initialEntries={[`/plugins/${pluginId}`]}>
        <ReleaseModal
          handleClose={handleCloseMocked}
          handleSubmit={jest.fn()}
          initialValues={{ name: '', date: null, time: '', timezone: '', scheduledAt: null }}
          isLoading={false}
        />
      </MemoryRouter>
    );
    const dialogCancelButton = screen.getByRole('button', {
      name: /cancel/i,
    });
    expect(dialogCancelButton).toBeInTheDocument();
    await user.click(dialogCancelButton);
    expect(handleCloseMocked).toHaveBeenCalledTimes(1);

    // the initial field value is empty
    const inputElement = screen.getByRole('textbox', { name: /name/i });
    expect(inputElement).toHaveValue('');

    // enable the submit button when there is content inside the input
    const dialogContinueButton = screen.getByRole('button', {
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

    // the initial field value is the title
    const inputElement = screen.getByRole('textbox', { name: /name/i });
    expect(inputElement).toHaveValue('title');

    // disable the submit button when there are no changes inside the input
    const dialogSaveButton = screen.getByRole('button', {
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
    const dateField = screen.getByRole('combobox', {
      name: /date/i,
    });
    await waitFor(() => {
      expect(dateField).toBeInTheDocument();
    });

    const time = screen.getByRole('combobox', {
      name: /time\s/i,
    });
    await waitFor(() => {
      expect(time).toBeInTheDocument();
    });

    const timezone = screen.getByRole('combobox', {
      name: /timezone/i,
    });
    await waitFor(() => {
      expect(timezone).toBeInTheDocument();
    });
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
    const scheduleReleaseCheck = screen.getByRole('checkbox', {
      name: /schedule release/i,
    });
    // Click Schedule release checkbox
    fireEvent.click(scheduleReleaseCheck);
    expect(scheduleReleaseCheck).toBeChecked();

    const dialogSaveButton = screen.getByRole('button', {
      name: /save/i,
    });
    // save button is disabled initially
    expect(dialogSaveButton).toBeDisabled();

    const date = screen.getByRole('combobox', {
      name: /date/i,
    });
    await user.click(date);
    await user.click(screen.getByRole('gridcell', { name: 'Sunday, March 3, 2024' }));

    const time = screen.getByRole('combobox', {
      name: 'Time *',
    });

    await user.click(time);
    await user.click(screen.getByRole('option', { name: '14:00' }));

    const timezone = screen.getByRole('combobox', {
      name: /timezone/i,
    });
    await user.click(timezone);
    await user.click(screen.getByRole('option', { name: 'UTC+00:00 Africa/Abidjan' }));

    // save button is enabled after filling all scheduling fields
    expect(dialogSaveButton).toBeEnabled();
  });
});
