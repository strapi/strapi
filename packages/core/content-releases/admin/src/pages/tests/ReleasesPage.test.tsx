import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ReleasesPage } from '../ReleasesPage';

import { mockReleasesPageData } from './mockReleasesPageData';

const mockGetFeature = jest.fn();

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useLicenseLimits: jest.fn().mockReturnValue({
    isLoading: false,
    isError: false,
    license: {
      enforcementUserCount: 10,
      licenseLimitStatus: '',
      permittedSeats: 3,
      isHostedOnStrapiCloud: false,
    },
    getFeature: (name: string) => mockGetFeature(name),
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

  beforeEach(() => {
    mockGetFeature.mockReturnValue({ maximumReleases: 3 });
  });

  it('renders the tab content correctly when there are no releases', async () => {
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.emptyEntries))
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
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.pendingEntries))
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

  it.each([
    ['0', { maximumReleases: '0' }],
    ['0 (number)', { maximumReleases: 0 }],
    ['missing', {}],
    ['non-numeric', { maximumReleases: 'many' }],
  ])(
    'limits pending releases to the default of 3 when the license limit is %s',
    async (_, options) => {
      mockGetFeature.mockReturnValue(options);
      server.use(
        http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.pendingEntries))
      );

      render(<ReleasesPage />);

      const newReleaseButton = await screen.findByRole('button', { name: /new release/i });
      expect(newReleaseButton).toBeDisabled();
      expect(
        screen.getByText(/you have reached the 3 pending releases limit/i)
      ).toBeInTheDocument();
    }
  );

  it('reads a numeric license limit', async () => {
    mockGetFeature.mockReturnValue({ maximumReleases: 20 });
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.pendingEntries))
    );

    render(<ReleasesPage />);

    await screen.findByText('Pending (17)');
    expect(screen.getByRole('button', { name: /new release/i })).toBeEnabled();
    expect(screen.queryByText(/pending releases limit/i)).not.toBeInTheDocument();
  });
});
