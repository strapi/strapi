/**
 * Days and times are the viewer's: run in a timezone that isn't UTC
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import { defaultTestStoreConfig, fireEvent, render, screen } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';

let currentSearch = '';

// Renders nothing: the query string in the DOM would match the text queries on the tags
const LocationSpy = () => {
  currentSearch = useLocation().search;

  return null;
};

const getAppliedFilterEntries = () =>
  [...new URLSearchParams(currentSearch).entries()].filter(([key]) =>
    key.startsWith('filters[$and]')
  );

const OPTIONS = [
  { name: 'publishedAt', label: 'Published at', type: 'datetime' },
  { name: 'title', label: 'Title', type: 'string' },
] satisfies Filters.Filter[];

const renderFilters = (search = '', options?: Parameters<typeof render>[1]) =>
  render(
    <Filters.Root options={OPTIONS}>
      <Filters.Trigger />
      <Filters.Popover />
      <Filters.List />
      <LocationSpy />
    </Filters.Root>,
    { initialEntries: [{ search }], ...options }
  );

const openPublishedAtFilter = async (user: ReturnType<typeof render>['user']) => {
  await user.click(screen.getByRole('button', { name: 'Filters' }));
  await user.click(screen.getByRole('combobox', { name: 'Select field' }));
  await user.click(screen.getByRole('option', { name: 'Published at' }));
};

const pickDate = async (user: ReturnType<typeof render>['user'], date: string) => {
  await user.type(screen.getByRole('combobox', { name: 'Published at date' }), date);
  await user.keyboard('{Enter}');
};

const typeTime = async (user: ReturnType<typeof render>['user'], time: string) => {
  const timeInput = screen.getByRole('combobox', { name: 'Published at time (optional)' });
  await user.type(timeInput, time);
  // Closes the list of times; the typed time is kept when the field loses focus
  await user.keyboard('{Enter}');
  fireEvent.blur(timeInput);

  return timeInput;
};

// The select's overlay blocks `user.click` in jsdom
const addFilter = () => fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

beforeEach(() => {
  currentSearch = '';
});

describe('Filters on a date-time field', () => {
  it('stores a date alone as the whole day, and shows no time', async () => {
    const { user } = renderFilters();
    await openPublishedAtFilter(user);

    // Nothing to narrow down before a date is picked
    expect(screen.getByRole('combobox', { name: 'Published at time (optional)' })).toBeDisabled();
    await pickDate(user, '10/23/2026');
    expect(screen.getByRole('combobox', { name: 'Published at time (optional)' })).toBeEnabled();
    addFilter();

    expect(
      await screen.findByText('Published at $eq Friday, October 23, 2026')
    ).toBeInTheDocument();
    expect(getAppliedFilterEntries()).toEqual([
      ['filters[$and][0][publishedAt][$eq]', '2026-10-23'],
    ]);
  });

  it('stores a date and a time as that minute, and shows the time', async () => {
    const { user } = renderFilters();
    await openPublishedAtFilter(user);

    await pickDate(user, '10/23/2026');
    await typeTime(user, '10:53');
    addFilter();

    expect(
      await screen.findByText(/^Published at \$eq Friday, October 23, 2026.+10:53/)
    ).toBeInTheDocument();
    expect(getAppliedFilterEntries()).toEqual([
      ['filters[$and][0][publishedAt][$eq]', new Date(2026, 9, 23, 10, 53).toISOString()],
    ]);
  });

  it('goes back to the whole day when the picked time is cleared', async () => {
    const { user } = renderFilters();
    await openPublishedAtFilter(user);

    await pickDate(user, '10/23/2026');
    const timeInput = await typeTime(user, '10:53');
    fireEvent.click(screen.getByRole('button', { name: 'Clear Published at time' }));
    fireEvent.blur(timeInput);

    expect(timeInput).toHaveValue('');
    addFilter();

    expect(
      await screen.findByText('Published at $eq Friday, October 23, 2026')
    ).toBeInTheDocument();
    expect(getAppliedFilterEntries()).toEqual([
      ['filters[$and][0][publishedAt][$eq]', '2026-10-23'],
    ]);
  });

  it('keeps the picked date and time when editing the filter', async () => {
    const value = new Date(2026, 9, 23, 10, 53).toISOString();
    const { user } = renderFilters(`?filters[$and][0][publishedAt][$ne]=${value}`);

    await user.click(await screen.findByText(/^Published at \$ne .+10:53/));

    expect(await screen.findByRole('combobox', { name: 'Published at date' })).toHaveValue(
      '10/23/2026'
    );
    expect(screen.getByRole('combobox', { name: 'Published at time (optional)' })).toHaveValue(
      '10:53'
    );
  });

  it('shows the minute of a full ISO value from an older link', async () => {
    renderFilters('?filters[$and][0][publishedAt][$gt]=2026-10-23T08:53:02.123Z');

    expect(
      await screen.findByText(/^Published at \$gt Friday, October 23, 2026.+10:53/)
    ).toBeInTheDocument();
  });

  it('shows the picked time in the format of the admin locale', async () => {
    const storeConfig = defaultTestStoreConfig();
    storeConfig.preloadedState.admin_app.language.locale = 'fi';
    const value = new Date(2026, 9, 23, 10, 53).toISOString();
    const { user } = renderFilters(`?filters[$and][0][publishedAt][$eq]=${value}`, {
      providerOptions: { storeConfig },
    });

    await user.click(await screen.findByText(/^Published at .+10\.53/));

    expect(screen.getByRole('combobox', { name: 'Published at time (optional)' })).toHaveValue(
      '10.53'
    );
  });

  it('shows no value for "is null"', async () => {
    renderFilters('?filters[$and][0][publishedAt][$null]=true');

    expect(await screen.findByText('Published at $null')).toBeInTheDocument();
  });
});
