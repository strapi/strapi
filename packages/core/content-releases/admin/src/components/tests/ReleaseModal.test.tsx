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
});
