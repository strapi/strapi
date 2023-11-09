import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { ReleasePage } from '../Release';

const user = userEvent.setup();

const render = () =>
  renderRTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <MemoryRouter>
          <ReleasePage />
        </MemoryRouter>
      </IntlProvider>
    </ThemeProvider>
  );

describe('Release details page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly the heading content', async () => {
    render();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Release title');
    // if there are 0 entries
    expect(screen.getByText('No entries')).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).toBeInTheDocument();

    const releaseButton = screen.getByRole('button', { name: 'Release' });
    expect(releaseButton).toBeInTheDocument();

    const moreButton = screen.getByRole('button', { name: 'Release actions' });
    expect(moreButton).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeInTheDocument();
  });

  it('shows empty content if there are no entries', async () => {
    render();

    expect(screen.getByText('No entries')).toBeInTheDocument();
  });
});
