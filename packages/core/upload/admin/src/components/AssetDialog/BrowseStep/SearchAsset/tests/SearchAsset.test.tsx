// TODO: find a better naming convention for the file that was an index file before
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { SearchAsset } from '../SearchAsset';

import type { Query } from '../../../../../../../shared/contracts/files';

const handleChange = jest.fn();

const makeApp = (queryValue: Query['_q'] | null) => (
  <DesignSystemProvider>
    <IntlProvider locale="en">
      <SearchAsset onChangeSearch={handleChange} queryValue={queryValue} />
    </IntlProvider>
  </DesignSystemProvider>
);

describe('SearchAsset', () => {
  it('renders a search icon button when not open', () => {
    const { getByRole, queryByRole } = render(makeApp(null));

    // Should initially show a button with the search icon
    const searchButton = getByRole('button', { name: 'Search' });
    expect(searchButton).toBeInTheDocument();

    // Should not display the searchbar yet
    const searchInput = queryByRole('textbox', { name: 'search' });
    expect(searchInput).not.toBeInTheDocument();
  });

  it('shows searchbar after clicking the search button', () => {
    const { getByRole } = render(makeApp(null));

    // Click the search button
    const searchButton = getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    // Now it should show the searchbar
    const searchInput = getByRole('textbox', { name: 'search' });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
  });

  it('should set input value to queryValue if it exists', () => {
    const queryValue = 'michka';
    const { getByRole } = render(makeApp(queryValue));

    const input = getByRole('textbox', {
      name: 'search',
    }) as HTMLInputElement;

    expect(input).toBeInTheDocument();
    expect(input?.value).toEqual(queryValue);
  });

  it('should call handleChange when submitting search input', () => {
    const { getByRole } = render(makeApp(null));

    const button = getByRole('button');

    if (button) {
      fireEvent.click(button);
    }
    const input = getByRole('textbox', {
      name: 'search',
    });

    if (input) {
      fireEvent.change(input, { target: { value: 'michka' } });
      fireEvent.submit(input);
    }

    expect(handleChange.mock.calls.length).toBe(1);
  });
});
