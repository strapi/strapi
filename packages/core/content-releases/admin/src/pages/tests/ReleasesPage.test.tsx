/**
 * Days and times are the viewer's: run the date filters in a timezone that isn't UTC
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import { adminApi } from '@strapi/admin/strapi-admin';
import { within } from '@testing-library/react';
import { defaultTestStoreConfig, fireEvent, render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ReleasesPage } from '../ReleasesPage';

import { mockReleasesPageData } from './mockReleasesPageData';

// Review workflows' stage endpoint, injected after the releases service as in the admin, where
// the review-workflows plugin loads after this one
const reviewWorkflowsApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['Document', 'ReviewWorkflowStages'] })
  .injectEndpoints({
    endpoints: (build) => ({
      updateStage: build.mutation<unknown, { id: string }>({
        query: ({ id }) => ({
          url: `/review-workflows/content-manager/collection-types/api::article.article/${id}/stage`,
          method: 'PUT',
          data: { id: 2 },
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'Document', id: `api::article.article_${id}` },
          { type: 'Document', id: 'api::article.article_LIST' },
          'ReviewWorkflowStages',
        ],
      }),
    }),
  });

const StageChanger = () => {
  const [updateStage] = reviewWorkflowsApi.useUpdateStageMutation();

  return (
    <button type="button" onClick={() => updateStage({ id: 'doc-1' })}>
      Change stage
    </button>
  );
};

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

  // Answers like the API: a status filter finds nothing, anything else finds every release
  const captureRequests = () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get('/content-releases', ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        return HttpResponse.json(
          params.has('filters[$and][0][status][$eq]')
            ? mockReleasesPageData.emptyEntries
            : mockReleasesPageData.releasesByStatus
        );
      })
    );
    return requests;
  };

  it('renders the empty state when there are no releases', async () => {
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.emptyEntries))
    );

    render(<ReleasesPage />);

    expect(await screen.findByText('No releases')).toBeInTheDocument();
    expect(screen.getByText('0 releases')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /entries per page/i })).not.toBeInTheDocument();
  });

  it('requests pending and done releases together, soonest scheduled first', async () => {
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
    expect(requestParams?.get('sort')).toBe('scheduledAt:asc');
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

  it('shows the scheduled time of releases that froze without running', async () => {
    const [base] = mockReleasesPageData.releasesByStatus.data;
    const frozen = {
      ...base,
      status: 'failed' as const,
      // Frozen by the overdue sweep two days after the schedule
      releasedAt: '2026-09-03T14:30:00.000Z',
      actions: { meta: { count: 5 } },
    };
    server.use(
      http.get('/content-releases', () =>
        HttpResponse.json({
          ...mockReleasesPageData.releasesByStatus,
          data: [
            {
              ...frozen,
              id: 1,
              name: 'Missed campaign',
              failureReason: 'missed_schedule',
              scheduledAt: '2026-09-01T09:00:00.000Z',
              timezone: 'UTC',
            },
            {
              ...frozen,
              id: 2,
              name: 'Pre-upgrade campaign',
              failureReason: 'failed_before_upgrade',
              scheduledAt: '2026-08-20T10:00:00.000Z',
              timezone: 'UTC',
            },
            {
              ...frozen,
              id: 3,
              name: 'Unscheduled pre-upgrade campaign',
              failureReason: 'failed_before_upgrade',
            },
          ],
        })
      )
    );

    render(<ReleasesPage />);

    await screen.findByRole('link', { name: 'Missed campaign' });
    const [missed, preUpgrade, unscheduled] = screen.getAllByRole('row').slice(1);

    expect(within(missed).getByText(/Sep 1, 2026 • 09:00 UTC/)).toBeInTheDocument();
    expect(missed).toHaveTextContent(/Was due \S/);
    expect(within(preUpgrade).getByText(/Aug 20, 2026 • 10:00 UTC/)).toBeInTheDocument();
    expect(preUpgrade).toHaveTextContent(/Was due \S/);
    expect(within(unscheduled).getByText('Not scheduled')).toBeInTheDocument();
    expect(screen.queryByText(/Sep 3, 2026/)).not.toBeInTheDocument();
  });

  it('words the schedule by whether it is to come, ran, or passed without a run', async () => {
    const [base] = mockReleasesPageData.releasesByStatus.data;
    const DAY = 24 * 60 * 60 * 1000;
    server.use(
      http.get('/content-releases', () =>
        HttpResponse.json({
          ...mockReleasesPageData.releasesByStatus,
          data: [
            {
              ...base,
              id: 1,
              name: 'Upcoming',
              status: 'ready',
              scheduledAt: new Date(Date.now() + 3 * DAY).toISOString(),
            },
            {
              ...base,
              id: 2,
              name: 'Ran',
              status: 'done',
              scheduledAt: new Date(Date.now() - 4 * DAY).toISOString(),
              releasedAt: new Date(Date.now() - 3 * DAY).toISOString(),
            },
            // Its schedule passed, but the sweep hasn't frozen it yet
            {
              ...base,
              id: 3,
              name: 'Overdue',
              status: 'ready',
              scheduledAt: new Date(Date.now() - 3 * DAY).toISOString(),
            },
          ],
        })
      )
    );

    render(<ReleasesPage />);

    await screen.findByRole('link', { name: 'Upcoming' });
    const [upcoming, ran, overdue] = screen.getAllByRole('row').slice(1);

    // The calendar-day count depends on the time of day: the words are what this checks
    expect(upcoming).toHaveTextContent(/Scheduled in \d+ days/);
    expect(ran).toHaveTextContent(/Released \d+ days ago/);
    expect(overdue).toHaveTextContent(/Was due \d+ days ago/);
  });

  it("shows the API's error when creating a release fails", async () => {
    server.use(
      http.get('/content-releases', () => HttpResponse.json(mockReleasesPageData.emptyEntries)),
      http.post('/content-releases', () =>
        HttpResponse.json(
          {
            data: null,
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Release with name Winter campaign already exists',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = render(<ReleasesPage />);

    await user.click(await screen.findByRole('button', { name: 'New release' }));
    await user.type(screen.getByRole('textbox', { name: 'Release name' }), 'Winter campaign');
    await user.click(screen.getByRole('checkbox', { name: "I don't have a release date yet" }));
    fireEvent.click(screen.getByRole('button', { name: 'Create release' }));

    expect(
      await screen.findByText('Release with name Winter campaign already exists')
    ).toBeInTheDocument();
  });

  it("refetches the releases when an entry's review stage changes", async () => {
    const requests = captureRequests();
    server.use(http.put('*/stage', () => HttpResponse.json({ data: {} })));

    const { user } = render(
      <>
        <ReleasesPage />
        <StageChanger />
      </>
    );

    await screen.findByRole('link', { name: 'Holiday newsletter' });
    const requestCount = requests.length;

    await user.click(screen.getByRole('button', { name: 'Change stage' }));

    await waitFor(() => expect(requests.length).toBeGreaterThan(requestCount));
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

  describe('filters', () => {
    const getOptionLabels = () => screen.getAllByRole('option').map((option) => option.textContent);

    it('adds a status filter as a tag and sends it with the request', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />);

      await screen.findByRole('link', { name: 'Holiday newsletter' });
      await user.click(screen.getByRole('button', { name: 'Filters' }));

      await user.click(screen.getByRole('combobox', { name: 'Select field' }));
      expect(getOptionLabels()).toEqual(['Status', 'Release mode', 'Scheduled for', 'Released on']);
      await user.click(screen.getByRole('option', { name: 'Status' }));

      await user.click(screen.getByRole('combobox', { name: 'Select filter' }));
      expect(getOptionLabels()).toEqual(['is', 'is not']);
      await user.click(screen.getByRole('option', { name: 'is' }));

      await user.click(screen.getByRole('combobox', { name: 'Status' }));
      expect(getOptionLabels()).toEqual(['Ready', 'Blocked', 'Failed', 'Done', 'Partial', 'Empty']);
      await user.click(screen.getByRole('option', { name: 'Blocked' }));
      // The select's overlay blocks `user.click` in jsdom
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByText('No releases match these filters')).toBeInTheDocument();
      // The tag shows the status label, not its stored value (the operator label isn't loaded here)
      expect(screen.getByText(/^Status .+ Blocked$/)).toBeInTheDocument();
      expect(requests.at(-1)?.get('filters[$and][0][status][$eq]')).toBe('blocked');
    });

    it('reads the filters from the URL and ignores the removed tabs filter', async () => {
      const requests = captureRequests();
      render(<ReleasesPage />, {
        initialEntries: [
          '/?filters[releasedAt][$notNull]=false&filters[$and][0][releaseCondition][$ne]=allow_partial&filters[$and][1][scheduledAt][$null]=true',
        ],
      });

      expect(await screen.findByText(/^Release mode .+ Allow partial$/)).toBeInTheDocument();
      expect(screen.getByText(/^Scheduled for \S+$/)).toBeInTheDocument();

      await waitFor(() =>
        expect(requests.at(-1)?.get('filters[$and][0][releaseCondition][$ne]')).toBe(
          'allow_partial'
        )
      );
      const params = requests.at(-1)!;
      expect(params.get('filters[$and][1][scheduledAt][$null]')).toBe('true');
      expect(params.has('filters[releasedAt][$notNull]')).toBe(false);
    });

    it('ignores a hand-edited filters list that is not a list', async () => {
      const requests = captureRequests();
      render(<ReleasesPage />, { initialEntries: ['/?filters[$and]=x'] });

      expect(await screen.findByRole('link', { name: 'Holiday newsletter' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
      expect([...requests.at(-1)!.keys()].filter((key) => key.startsWith('filters'))).toEqual([]);
    });

    it.each(['Clear all', 'Clear filters'])('removes every filter with "%s"', async (label) => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />, {
        initialEntries: [
          '/?filters[$and][0][status][$eq]=blocked&filters[$and][1][releaseCondition][$eq]=all_or_nothing',
        ],
      });

      expect(await screen.findByText('No releases match these filters')).toBeInTheDocument();
      expect(screen.getByText(/^Status .+ Blocked$/)).toBeInTheDocument();
      expect(screen.getByText(/^Release mode .+ All required$/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: label }));

      expect(await screen.findByRole('link', { name: 'Holiday newsletter' })).toBeInTheDocument();
      expect(screen.queryByText(/^Status .+ Blocked$/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
      expect([...requests.at(-1)!.keys()].filter((key) => key.startsWith('filters'))).toEqual([]);
    });
  });

  describe('date filters', () => {
    const openReleasedOnFilter = async (user: ReturnType<typeof render>['user']) => {
      await screen.findByRole('link', { name: 'Holiday newsletter' });
      await user.click(screen.getByRole('button', { name: 'Filters' }));
      await user.click(screen.getByRole('combobox', { name: 'Select field' }));
      await user.click(screen.getByRole('option', { name: 'Released on' }));
    };

    const lastFilters = (requests: URLSearchParams[]) =>
      Object.fromEntries(
        [...requests.at(-1)!.entries()].filter(([key]) => key.startsWith('filters'))
      );

    it('matches the whole day when only a date is picked', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />);
      await openReleasedOnFilter(user);

      // Nothing to narrow down before a date is picked
      expect(screen.getByRole('combobox', { name: 'Released on time (optional)' })).toBeDisabled();
      await user.type(screen.getByRole('combobox', { name: 'Released on date' }), '10/23/2026');
      await user.keyboard('{Enter}');
      expect(screen.getByRole('combobox', { name: 'Released on time (optional)' })).toBeEnabled();
      // The select's overlay blocks `user.click` in jsdom
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByText(/^Released on .+ Oct 23, 2026$/)).toBeInTheDocument();
      await waitFor(() =>
        expect(lastFilters(requests)).toEqual({
          'filters[$and][0][releasedAt][$gte]': new Date(2026, 9, 23).toISOString(),
          'filters[$and][0][releasedAt][$lt]': new Date(2026, 9, 24).toISOString(),
        })
      );
    });

    // [EE-235] Autumn campaign: released at 10:53:04.506, the picker never produces seconds
    it('matches the whole minute when a time is picked too', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />);
      await openReleasedOnFilter(user);

      await user.type(screen.getByRole('combobox', { name: 'Released on date' }), '10/23/2026');
      await user.keyboard('{Enter}');
      const timeInput = screen.getByRole('combobox', { name: 'Released on time (optional)' });
      await user.type(timeInput, '10:53');
      // Closes the list of times; the typed time is kept when the field loses focus
      await user.keyboard('{Enter}');
      fireEvent.blur(timeInput);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByText(/^Released on .+ Oct 23, 2026.+10:53/)).toBeInTheDocument();
      await waitFor(() =>
        expect(lastFilters(requests)).toEqual({
          'filters[$and][0][releasedAt][$gte]': new Date(2026, 9, 23, 10, 53).toISOString(),
          'filters[$and][0][releasedAt][$lt]': new Date(2026, 9, 23, 10, 54).toISOString(),
        })
      );
    });

    it('goes back to the whole day when the picked time is cleared', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />);
      await openReleasedOnFilter(user);

      await user.type(screen.getByRole('combobox', { name: 'Released on date' }), '10/23/2026');
      await user.keyboard('{Enter}');
      const timeInput = screen.getByRole('combobox', { name: 'Released on time (optional)' });
      await user.type(timeInput, '10:53');
      await user.keyboard('{Enter}');
      fireEvent.blur(timeInput);
      fireEvent.click(screen.getByRole('button', { name: 'Clear Released on time' }));
      fireEvent.blur(timeInput);

      expect(timeInput).toHaveValue('');
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByText(/^Released on .+ Oct 23, 2026$/)).toBeInTheDocument();
      await waitFor(() =>
        expect(lastFilters(requests)).toEqual({
          'filters[$and][0][releasedAt][$gte]': new Date(2026, 9, 23).toISOString(),
          'filters[$and][0][releasedAt][$lt]': new Date(2026, 9, 24).toISOString(),
        })
      );
    });

    it('keeps the picked date and time when editing the filter', async () => {
      captureRequests();
      const value = new Date(2026, 9, 23, 10, 53).toISOString();
      const { user } = render(<ReleasesPage />, {
        initialEntries: [`/?filters[$and][0][releasedAt][$ne]=${value}`],
      });

      await user.click(await screen.findByText(/^Released on .+ Oct 23, 2026.+10:53/));

      expect(await screen.findByRole('combobox', { name: 'Released on date' })).toHaveValue(
        '10/23/2026'
      );
      expect(screen.getByRole('combobox', { name: 'Released on time (optional)' })).toHaveValue(
        '10:53'
      );
    });

    it('shows the picked time in the format of the admin locale', async () => {
      captureRequests();
      const storeConfig = defaultTestStoreConfig();
      storeConfig.preloadedState.admin_app.language.locale = 'fi';
      const value = new Date(2026, 9, 23, 10, 53).toISOString();
      const { user } = render(<ReleasesPage />, {
        initialEntries: [`/?filters[$and][0][releasedAt][$eq]=${value}`],
        providerOptions: { storeConfig },
      });

      await user.click(await screen.findByText(/^Released on .+10\.53/));

      const timeInput = await screen.findByRole('combobox', {
        name: 'Released on time (optional)',
      });
      // `fi` writes `10.53`: an `HH:mm` value would match no time of the list
      expect(timeInput).toHaveValue('10.53');
      // The picker reads the value back when the field loses focus
      fireEvent.blur(timeInput);
      expect(timeInput).toHaveValue('10.53');
    });

    it('sends "is not" as outside the day, and "is null" as it is', async () => {
      const requests = captureRequests();
      render(<ReleasesPage />, {
        initialEntries: [
          '/?filters[$and][0][scheduledAt][$ne]=2026-10-23&filters[$and][1][releasedAt][$null]=true',
        ],
      });

      expect(await screen.findByText(/^Scheduled for .+ Oct 23, 2026$/)).toBeInTheDocument();
      expect(screen.getByText(/^Released on \S+$/)).toBeInTheDocument();
      await waitFor(() =>
        expect(lastFilters(requests)).toEqual({
          'filters[$and][0][$or][0][scheduledAt][$lt]': new Date(2026, 9, 23).toISOString(),
          'filters[$and][0][$or][1][scheduledAt][$gte]': new Date(2026, 9, 24).toISOString(),
          'filters[$and][1][releasedAt][$null]': 'true',
        })
      );
    });
  });

  describe('sort', () => {
    const SCHEDULE_FROM = '2026-10-01T00:00:00.000Z';
    const FILTERED_URL = `/?filters[$and][0][releaseCondition][$eq]=all_or_nothing&filters[$and][1][scheduledAt][$gte]=${SCHEDULE_FROM}`;

    it('sorts by scheduled date, soonest first, by default', async () => {
      const requests = captureRequests();
      render(<ReleasesPage />);

      expect(
        await screen.findByRole('button', { name: 'Sort: Scheduled date (soonest first)' })
      ).toBeInTheDocument();
      await waitFor(() => expect(requests.at(-1)?.get('sort')).toBe('scheduledAt:asc'));
    });

    it('changes the sort, back to the first page, keeping the filters', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />, {
        initialEntries: [`${FILTERED_URL}&page=2&pageSize=8`],
      });

      await user.click(
        await screen.findByRole('button', { name: 'Sort: Scheduled date (soonest first)' })
      );
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Scheduled date (soonest first)',
        'Scheduled date (latest first)',
        'Most recent updates',
        'Oldest updates',
        'Most recently created',
        'Name (A to Z)',
        'Name (Z to A)',
      ]);
      await user.click(screen.getByRole('menuitem', { name: 'Name (A to Z)' }));

      expect(
        await screen.findByRole('button', { name: 'Sort: Name (A to Z)' })
      ).toBeInTheDocument();
      await waitFor(() => expect(requests.at(-1)?.get('sort')).toBe('name:asc'));
      const params = requests.at(-1)!;
      expect(params.get('page')).toBe('1');
      expect(params.get('pageSize')).toBe('8');
      expect(params.get('filters[$and][0][releaseCondition][$eq]')).toBe('all_or_nothing');
      expect(params.get('filters[$and][1][scheduledAt][$gte]')).toBe(SCHEDULE_FROM);
      expect(screen.getByText(/^Release mode .+ All required$/)).toBeInTheDocument();
    });

    it('keeps the sort when a filter is added or cleared', async () => {
      const requests = captureRequests();
      const { user } = render(<ReleasesPage />, { initialEntries: ['/?sort=name:desc'] });

      await screen.findByRole('link', { name: 'Holiday newsletter' });
      await user.click(screen.getByRole('button', { name: 'Filters' }));
      await user.click(screen.getByRole('combobox', { name: 'Select field' }));
      await user.click(screen.getByRole('option', { name: 'Release mode' }));
      await user.click(screen.getByRole('combobox', { name: 'Release mode' }));
      await user.click(screen.getByRole('option', { name: 'Allow partial' }));
      // The select's overlay blocks `user.click` in jsdom
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByText(/^Release mode .+ Allow partial$/)).toBeInTheDocument();
      await waitFor(() =>
        expect(requests.at(-1)?.get('filters[$and][0][releaseCondition][$eq]')).toBe(
          'allow_partial'
        )
      );
      expect(requests.at(-1)?.get('sort')).toBe('name:desc');

      await user.click(screen.getByRole('button', { name: 'Clear all' }));

      await waitFor(() =>
        expect(requests.at(-1)?.has('filters[$and][0][releaseCondition][$eq]')).toBe(false)
      );
      expect(requests.at(-1)?.get('sort')).toBe('name:desc');
      expect(screen.getByRole('button', { name: 'Sort: Name (Z to A)' })).toBeInTheDocument();
    });

    it('keeps the sort and the filters when changing page', async () => {
      const { data, meta } = mockReleasesPageData.pendingEntries;
      const requests: URLSearchParams[] = [];
      server.use(
        http.get('/content-releases', ({ request }) => {
          const params = new URL(request.url).searchParams;
          requests.push(params);
          const page = Number(params.get('page'));
          return HttpResponse.json({
            data: data.slice(
              (page - 1) * meta.pagination.pageSize,
              page * meta.pagination.pageSize
            ),
            meta: { ...meta, pagination: { ...meta.pagination, page } },
          });
        })
      );
      const { user } = render(<ReleasesPage />, {
        initialEntries: [`${FILTERED_URL}&sort=createdAt:desc`],
      });

      await screen.findByRole('link', { name: 'entry 1' });
      await user.click(screen.getByRole('link', { name: /go to next page/i }));

      expect(await screen.findByRole('link', { name: 'entry 17' })).toBeInTheDocument();
      const params = requests.at(-1)!;
      expect(params.get('page')).toBe('2');
      expect(params.get('sort')).toBe('createdAt:desc');
      expect(params.get('filters[$and][0][releaseCondition][$eq]')).toBe('all_or_nothing');
      expect(params.get('filters[$and][1][scheduledAt][$gte]')).toBe(SCHEDULE_FROM);
    });

    it('still applies a sort from the URL that the menu does not offer', async () => {
      const requests = captureRequests();
      render(<ReleasesPage />, { initialEntries: ['/?sort=releasedAt:desc'] });

      expect(await screen.findByRole('button', { name: 'Sort' })).toBeInTheDocument();
      await waitFor(() => expect(requests.at(-1)?.get('sort')).toBe('releasedAt:desc'));
    });
  });
});
