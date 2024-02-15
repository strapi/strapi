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
    render(
      <ReleaseModal
        handleClose={jest.fn()}
        handleSubmit={jest.fn()}
        initialValues={{ name: 'title', date: null, time: '', timezone: '', scheduledAt: null }}
        isLoading={false}
      />
    );

    // the initial field value is the title
    const inputElement = screen.getByRole('textbox', { name: /name/i });
    expect(inputElement).toHaveValue('title');
  });

  it('should show scheduled fields when selecting schedule release', async () => {
    render(
      <ReleaseModal
        handleClose={jest.fn()}
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
});
