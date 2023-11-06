import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ReleasesPage } from '../Releases';

const user = userEvent.setup();

const render = () =>
  renderRTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <ReleasesPage />
      </IntlProvider>
    </ThemeProvider>
  );

describe('Releases home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Releases title as an heading and subtitle with number of releases', () => {
    render();
    const pageTitle = screen.getByRole('heading', { level: 1 });
    expect(pageTitle).toHaveTextContent('Releases');
    // if there are 0 releases
    expect(screen.getByText('No releases')).toBeInTheDocument();
  });

  it('shows a dialog when clicking on the "New release" button', async () => {
    render();
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

  it('hides the dialog when clicking on the "Cancel" button', async () => {
    render();
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

  it("disables continue button when there's no release name", async () => {
    render();
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
