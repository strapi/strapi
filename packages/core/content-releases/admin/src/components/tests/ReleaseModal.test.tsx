import { within } from '@testing-library/react';
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
          initialValues={{ name: '' }}
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
        initialValues={{ name: 'title' }}
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
});
