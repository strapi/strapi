import { within, screen } from '@testing-library/react';
import { render } from '@tests/utils';

import { ReleasesPage } from '../ReleasesPage';

describe('Releases home page', () => {
  it('renders correctly the heading content', async () => {
    const { user } = render(<ReleasesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Releases');
    // if there are 0 releases
    expect(screen.getByText('No releases')).toBeInTheDocument();

    const newReleaseButton = screen.getByRole('button', { name: 'New release' });
    expect(newReleaseButton).toBeInTheDocument();
    await user.click(newReleaseButton);

    const dialogContainer = screen.getByRole('dialog');
    const dialogTitle = within(dialogContainer).getByText(/new release/i);
    expect(dialogTitle).toBeInTheDocument();

    const dialogCloseButton = within(dialogContainer).getByRole('button', {
      name: /close the modal/i,
    });
    expect(dialogCloseButton).toBeInTheDocument();
    await user.click(dialogCloseButton);
    expect(dialogTitle).not.toBeInTheDocument();
  });

  it('hides the dialog', async () => {
    const { user } = render(<ReleasesPage />);
    const newReleaseButton = screen.getByRole('button', { name: 'New release' });
    await user.click(newReleaseButton);

    const dialogContainer = screen.getByRole('dialog');
    const dialogCancelButton = within(dialogContainer).getByRole('button', {
      name: /cancel/i,
    });
    expect(dialogCancelButton).toBeInTheDocument();
    await user.click(dialogCancelButton);
    expect(dialogContainer).not.toBeInTheDocument();
  });

  it('enables the submit button when there is content in the input', async () => {
    const { user } = render(<ReleasesPage />);
    const newReleaseButton = screen.getByRole('button', { name: 'New release' });
    await user.click(newReleaseButton);

    const dialogContainer = screen.getByRole('dialog');
    const dialogContinueButton = within(dialogContainer).getByRole('button', {
      name: /continue/i,
    });
    expect(dialogContinueButton).toBeInTheDocument();
    expect(dialogContinueButton).toBeDisabled();

    const inputElement = within(dialogContainer).getByRole('textbox', { name: /name/i });
    await user.type(inputElement, 'new release');
    expect(dialogContinueButton).toBeEnabled();
  });
});
