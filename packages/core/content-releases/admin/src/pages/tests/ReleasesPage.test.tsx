import { within, screen } from '@testing-library/react';
import { render, server } from '@tests/utils';
import { rest } from 'msw';

import { ReleasesPage } from '../ReleasesPage';

import { mockData } from './mockData';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element}) => <div>{children}</div>
}));

describe('Releases home page', () => {
  it('renders correctly the page with no results (subtitle, no pagination, body content, add release dialog)', async () => {
    server.use(
      rest.get('/content-releases', (req, res, ctx) => res(ctx.json(mockData.emptyEntries)))
    );
    const { user } = render(<ReleasesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Releases');
    const releaseSubtitle = await screen.findByText('No releases');
    expect(releaseSubtitle).toBeInTheDocument();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).not.toBeInTheDocument();

    const newReleaseButton = screen.getByRole('button', { name: 'New release' });
    expect(newReleaseButton).toBeInTheDocument();
    await user.click(newReleaseButton);

    const emptyPendingBodyContent = screen.getByText(/no pending entries/i);
    expect(emptyPendingBodyContent).toBeInTheDocument();

    // change the tab to see the done empty body content
    const doneTab = screen.getByRole('tab', { name: /done/i });
    await user.click(doneTab);

    const emptyDoneBodyContent = screen.getByText(/no done entries/i);
    expect(emptyDoneBodyContent).toBeInTheDocument();
  });

  it('renders correctly the page with only pending results (subtitle, pagination, body content, add release dialog)', async () => {
    server.use(
      rest.get('/content-releases', (req, res, ctx) => {
        return res(ctx.json(mockData.pendingEntries));
      })
    );
    const { user } = render(<ReleasesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Releases');
    const releaseSubtitle = await screen.findByText('17 releases');
    expect(releaseSubtitle).toBeInTheDocument();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).toBeInTheDocument();

    const firstEntry = screen.getByRole('heading', { level: 3, name: 'entry 1' });
    expect(firstEntry).toBeInTheDocument();

    const nextPageButton = screen.getByRole('link', { name: /go to next page/i });
    await user.click(nextPageButton);
    const lastEntry = screen.getByRole('heading', { level: 3, name: 'entry 17' });
    expect(lastEntry).toBeInTheDocument();

    // change the tab to see the done empty body content
    const doneTab = screen.getByRole('tab', { name: /done/i });
    await user.click(doneTab);
    /* TODO: add this test */
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
