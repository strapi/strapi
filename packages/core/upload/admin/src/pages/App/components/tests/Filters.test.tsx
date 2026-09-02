import { render, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';

const LocationSpy = () => <div data-testid="location">{useLocation().search}</div>;

const CREATED_AT = 'filters[$and][0][createdAt][$eq]=2024-01-01';
const UPDATED_AT = 'filters[$and][1][updatedAt][$eq]=2024-02-02';

const setup = (search: string) =>
  render(
    <>
      <Filters />
      <LocationSpy />
    </>,
    { initialEntries: [{ search }] }
  );

const getLocation = () => screen.getByTestId('location').textContent ?? '';

const getChipRemoveButton = (label: string | RegExp) => {
  const labels = screen.getAllByText(/\$eq/);
  const index = labels.findIndex((node) => Boolean(node.textContent?.match(label)));

  return screen.getAllByRole('button', { name: '' })[index];
};

describe('Media Library <Filters />', () => {
  it.each([
    ['a percent sign', '100%'],
    ['an ampersand', 'a&b'],
    ['a hash', 'a#b'],
  ])('keeps a search term containing %s when a filter chip is removed', async (_label, term) => {
    const { user } = setup(`?_q=${encodeURIComponent(term)}&${CREATED_AT}&${UPDATED_AT}`);

    await user.click(getChipRemoveButton(/createdAt \$eq/));

    await waitFor(() => {
      expect(getLocation()).not.toContain('createdAt');
    });

    expect(getLocation()).toContain(`_q=${encodeURIComponent(term)}`);
    expect(new URLSearchParams(getLocation()).get('_q')).toBe(term);
    expect(getLocation()).toContain('[updatedAt][$eq]=2024-02-02');
  });
});
