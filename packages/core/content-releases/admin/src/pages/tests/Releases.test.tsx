import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ReleasesPage } from '../Releases';

const render = () => ({
  ...renderRTL(<ReleasesPage />, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          {children}
        </IntlProvider>
      </ThemeProvider>
    ),
  }),
  user: userEvent.setup(),
});

describe('Releases home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Releases title as an heading', async () => {
    const { getByRole } = render();

    const pageTitle = getByRole('heading', { level: 1 });
    expect(pageTitle).toHaveTextContent('Releases');
  });

  it('shows a subtitle with the numnber of releases', async () => {
    const { getByText } = render();

    // if there are 0 releases
    expect(getByText('No releases')).toBeInTheDocument();
  });

  it('shows a button to create a new release', async () => {
    const { getByRole } = render();

    const newReleaseButton = getByRole('button', { name: 'New release' });

    expect(newReleaseButton).toBeInTheDocument();
  });

  it('shows a dialog when clicking on the "New release" button', async () => {
    const { user, getByRole } = render();

    const newReleaseButton = getByRole('button', { name: 'New release' });

    await user.click(newReleaseButton);

    const dialogContainer = getByRole('dialog');

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
    const { user, getByRole } = render();

    const newReleaseButton = getByRole('button', { name: 'New release' });

    await user.click(newReleaseButton);

    const dialogContainer = getByRole('dialog');

    const dialogCancelButton = within(dialogContainer).getByRole('button', {
      name: /cancel/i,
    });

    expect(dialogCancelButton).toBeInTheDocument();

    await user.click(dialogCancelButton);

    expect(dialogContainer).not.toBeInTheDocument();
  });

  it('shows the button Continue at the beginning disabled and then enabled when you enter some text, to submit the new release', async () => {
    const { user, getByRole } = render();

    const newReleaseButton = getByRole('button', { name: 'New release' });

    await user.click(newReleaseButton);

    const dialogContainer = getByRole('dialog');

    const dialogContinueButton = within(dialogContainer).getByRole('button', {
      name: /continue/i,
    });

    expect(dialogContinueButton).toBeInTheDocument();
    expect(dialogContinueButton).toBeDisabled();

    const value = 'new release';

    const inputElement = within(dialogContainer).getByRole('textbox', { name: /name/i });

    await user.type(inputElement, value);

    expect(dialogContinueButton).toBeEnabled();
  });
});
