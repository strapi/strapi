import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';

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

  it('renders the empty state when there are no releases', async () => {
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.emptyEntries))
    );

    render(<ReleasesPage />);

    expect(await screen.findByText('No releases')).toBeInTheDocument();
    expect(screen.getByText('0 releases')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /entries per page/i })).not.toBeInTheDocument();
  });

  it('requests pending and done releases together, most recently updated first', async () => {
    let requestParams: URLSearchParams | undefined;
    server.use(
      http.get('/content-releases', ({ request }) => {
        requestParams = new URL(request.url).searchParams;
        return HttpResponse.json(mockReleasesPageData.releasesByStatus);
      })
    );

    render(<ReleasesPage />);

    expect(await screen.findByRole('link', { name: 'Holiday newsletter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Summer campaign' })).toBeInTheDocument();
    expect(screen.getByText('6 releases')).toBeInTheDocument();
    expect(requestParams?.get('sort')).toBe('updatedAt:desc');
    // No releasedAt filter: pending and done releases come back together
    expect([...(requestParams?.keys() ?? [])].filter((key) => key.startsWith('filters'))).toEqual(
      []
    );
  });

  it('renders the status, schedule, entries and release mode columns', async () => {
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.releasesByStatus))
    );

    render(<ReleasesPage />);

    await screen.findByRole('link', { name: 'Holiday newsletter' });
    const rows = screen.getAllByRole('row').slice(1);
    const [empty, ready, blocked, done, partial, failed] = rows;

    expect(within(empty).getByText('Empty')).toBeInTheDocument();
    expect(within(empty).getByText('Not scheduled')).toBeInTheDocument();
    expect(within(empty).getByText('0 entries')).toBeInTheDocument();
    expect(within(empty).getByText('Allow partial')).toBeInTheDocument();

    expect(within(ready).getByText('Ready')).toBeInTheDocument();
    expect(within(ready).getByText('18 entries')).toBeInTheDocument();
    expect(within(ready).getByText('15 of 18 ready')).toBeInTheDocument();
    expect(within(ready).getByText(/Oct 15, 2026 • 09:00 UTC/)).toBeInTheDocument();

    expect(within(blocked).getByText('Blocked')).toBeInTheDocument();
    expect(within(blocked).getByText('0 of 24 ready')).toBeInTheDocument();
    expect(within(blocked).getByText('All required')).toBeInTheDocument();

    // An empty release that ran is Done: the stored status wins over the counts
    expect(within(done).getByText('Done')).toBeInTheDocument();
    expect(within(done).getByText('0 entries')).toBeInTheDocument();

    expect(within(partial).getByText('Partial')).toBeInTheDocument();
    expect(within(partial).getByText('5 entries')).toBeInTheDocument();
    expect(within(failed).getByText('Failed')).toBeInTheDocument();

    // Frozen releases don't show a readiness line
    [done, partial, failed].forEach((row) => {
      expect(within(row).queryByText(/ready$/)).not.toBeInTheDocument();
    });
  });

  it('paginates and blocks new releases once the pending limit is reached', async () => {
    const { data, meta } = mockReleasesPageData.pendingEntries;
    // `Promise.withResolvers` needs Node 22, the engines still allow Node 20
    let resolveSecondPage: () => void = () => {};
    const secondPage = new Promise<void>((resolve) => {
      resolveSecondPage = resolve;
    });
    server.use(
      http.get('/content-releases', async ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        if (page === 2) {
          await secondPage;
        }
        return HttpResponse.json({
          data: data.slice((page - 1) * meta.pagination.pageSize, page * meta.pagination.pageSize),
          meta: { ...meta, pagination: { ...meta.pagination, page } },
        });
      })
    );

    const { user } = render(<ReleasesPage />);

    expect(await screen.findByRole('link', { name: 'entry 1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'entry 17' })).not.toBeInTheDocument();
    expect(screen.getByText('17 releases')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /go to next page/i }));

    // While the next page loads, the header and the pending limit keep the last known counts
    expect(screen.getByText('17 releases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new release/i })).toBeDisabled();

    resolveSecondPage();

    expect(await screen.findByRole('link', { name: 'entry 17' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'entry 1' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /new release/i })).toBeDisabled();
    expect(screen.getByText(/you have reached the 3 pending releases limit/i)).toBeInTheDocument();
  });
});
