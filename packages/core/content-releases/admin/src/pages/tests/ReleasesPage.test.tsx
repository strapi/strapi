import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleasesPage } from '../ReleasesPage';

import { mockReleasesPageData } from './mockReleasesPageData';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
}));

describe('Releases home page', () => {
  it('renders the tab content correctly when there are no releases', async () => {
    server.use(
      rest.get('/content-releases', (req, res, ctx) =>
        res(ctx.json(mockReleasesPageData.emptyEntries))
      )
    );

    render(<ReleasesPage />);

    const releaseSubtitle = await screen.findAllByText('No releases');
    expect(releaseSubtitle[0]).toBeInTheDocument();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).not.toBeInTheDocument();

    const pendingTabPanel = screen.getByRole('tabpanel', { name: /pending/i });
    const emptyPendingBodyContent = within(pendingTabPanel).getByText(/no releases/i);

    expect(emptyPendingBodyContent).toBeInTheDocument();
  });

  it('renders the tab content correctly when there are releases', async () => {
    server.use(
      rest.get('/content-releases', (req, res, ctx) =>
        res(ctx.json(mockReleasesPageData.pendingEntries))
      )
    );

    const { user } = render(<ReleasesPage />);

    const releaseSubtitle = await screen.findByText('17 releases');
    expect(releaseSubtitle).toBeInTheDocument();

    const firstEntry = screen.getByRole('heading', { level: 3, name: 'entry 1' });
    expect(firstEntry).toBeInTheDocument();

    const nextPageButton = screen.getByRole('link', { name: /go to next page/i });
    await user.click(nextPageButton);

    const lastEntry = screen.getByRole('heading', { level: 3, name: 'entry 17' });
    expect(lastEntry).toBeInTheDocument();
  });
});
