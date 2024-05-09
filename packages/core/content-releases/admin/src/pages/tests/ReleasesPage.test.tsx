import { ReactNode } from 'react';

import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleasesPage } from '../ReleasesPage';

import { mockReleasesPageData } from './mockReleasesPageData';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useLicenseLimits: jest.fn().mockReturnValue({
    isLoading: false,
    isError: false,
    license: {
      enforcementUserCount: 10,
      licenseLimitStatus: '',
      permittedSeats: 3,
      isHostedOnStrapiCloud: false,
    },
    getFeature: jest.fn().mockReturnValue({ maximumReleases: 3 }),
  }),
}));

describe('Releases home page', () => {
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

    const pendingTab = await screen.findByText('Pending (17)');
    expect(pendingTab).toBeInTheDocument();

    const firstEntry = screen.getByRole('heading', { level: 3, name: 'entry 1' });
    expect(firstEntry).toBeInTheDocument();

    const nextPageButton = screen.getByRole('link', { name: /go to next page/i });
    await user.click(nextPageButton);

    const lastEntry = await screen.findByRole('heading', { level: 3, name: 'entry 17' });
    expect(lastEntry).toBeInTheDocument();

    // Check if you reached the maximum number of releases for license
    const newReleaseButton = await screen.findByRole('button', { name: /new release/i });
    expect(newReleaseButton).toBeDisabled();
    const limitReachedMessage = screen.getByText(/you have reached the 3 pending releases limit/i);
    expect(limitReachedMessage).toBeInTheDocument();
  });
});
