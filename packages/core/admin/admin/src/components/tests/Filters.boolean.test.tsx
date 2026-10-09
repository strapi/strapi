import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';

let currentSearch = '';

const LocationSpy = () => {
  currentSearch = useLocation().search;

  return null;
};

const FILTERS = [
  {
    name: 'firstname',
    label: 'Firstname',
    type: 'string',
  },
  {
    name: 'isActive',
    label: 'Active user',
    type: 'boolean',
  },
] satisfies Filters.Filter[];

describe('Filters boolean values', () => {
  beforeEach(() => {
    currentSearch = '';
  });

  it('applies false when a boolean filter is submitted in its false state', async () => {
    const { user } = renderRTL(
      <Filters.Root options={FILTERS}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Active user' }));

    const activeUserInput = await screen.findByRole('checkbox', { name: 'Active user' });
    expect(activeUserInput).not.toBeChecked();

    const addFilterButton = await screen.findByRole('button', { name: 'Add filter' });
    expect(addFilterButton).toBeEnabled();
    fireEvent.click(addFilterButton);

    await waitFor(() => {
      const params = new URLSearchParams(currentSearch);
      expect(params.get('filters[$and][0][isActive][$eq]')).toBe('false');
    });

    expect(await screen.findByText('Active user $eq false')).toBeInTheDocument();
  });
});
