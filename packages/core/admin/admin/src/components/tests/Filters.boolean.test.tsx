import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';

let currentSearch = '';

const LocationSpy = () => {
  currentSearch = useLocation().search;
  return null;
};

const FILTERS = [
  { name: 'firstname', label: 'Firstname', type: 'string' },
  { name: 'isActive', label: 'Active user', type: 'boolean' },
] satisfies Filters.Filter[];

describe('Filters boolean values', () => {
  beforeEach(() => {
    currentSearch = '';
  });

  const openActiveUserFilter = async (user: ReturnType<typeof renderRTL>['user']) => {
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Active user' }));
  };

  it('applies false when untouched (Toggle renders undefined as OFF)', async () => {
    const { user } = renderRTL(
      <Filters.Root options={FILTERS}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );
    await openActiveUserFilter(user);
    expect(await screen.findByRole('checkbox', { name: 'Active user' })).not.toBeChecked();
    const add = await screen.findByRole('button', { name: 'Add filter' });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    await waitFor(() => {
      expect(new URLSearchParams(currentSearch).get('filters[$and][0][isActive][$eq]')).toBe(
        'false'
      );
    });
    expect(await screen.findByText('Active user $eq false')).toBeInTheDocument();
  });

  it('applies true when toggled on', async () => {
    const { user } = renderRTL(
      <Filters.Root options={FILTERS}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );
    await openActiveUserFilter(user);
    const boxTrue = await screen.findByRole('checkbox', { name: 'Active user' });
    fireEvent.click(boxTrue);
    await waitFor(() => expect(boxTrue).toBeChecked());
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));
    await waitFor(() => {
      expect(new URLSearchParams(currentSearch).get('filters[$and][0][isActive][$eq]')).toBe(
        'true'
      );
    });
  });

  it('applies false after on->off toggle (explicit false)', async () => {
    const { user } = renderRTL(
      <Filters.Root options={FILTERS}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );
    await openActiveUserFilter(user);
    const box = await screen.findByRole('checkbox', { name: 'Active user' });
    fireEvent.click(box); // true
    await waitFor(() => expect(box).toBeChecked());
    fireEvent.click(box); // false
    await waitFor(() => expect(box).not.toBeChecked());

    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));
    await waitFor(() => {
      expect(new URLSearchParams(currentSearch).get('filters[$and][0][isActive][$eq]')).toBe(
        'false'
      );
    });
  });

  it('does not apply a filter when cleared to null', async () => {
    const { user } = renderRTL(
      <Filters.Root options={FILTERS}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );
    await openActiveUserFilter(user);
    await user.click(await screen.findByRole('button', { name: 'Clear' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));
    // give it a tick, then assert nothing was written
    await new Promise((r) => setTimeout(r, 50));
    expect(currentSearch).not.toContain('filters[$and]');
  });
});
