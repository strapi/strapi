import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { AddReleaseDialog } from '../AddReleaseDialog';

describe('AddReleaseDialog', () => {
  it('renders correctly the dialog content', async () => {
    const handleCloseMocked = jest.fn();
    const { user } = render(<AddReleaseDialog handleClose={handleCloseMocked} />);
    const dialogContainer = screen.getByRole('dialog');
    const dialogCancelButton = within(dialogContainer).getByRole('button', {
      name: /cancel/i,
    });
    expect(dialogCancelButton).toBeInTheDocument();
    await user.click(dialogCancelButton);
    expect(handleCloseMocked).toHaveBeenCalledTimes(1);

    // enable the submit button when there is content inside the input
    const dialogContinueButton = within(dialogContainer).getByRole('button', {
      name: /continue/i,
    });
    const inputElement = within(dialogContainer).getByRole('textbox', { name: /name/i });
    await user.type(inputElement, 'new release');
    expect(dialogContinueButton).toBeEnabled();
  });
});
