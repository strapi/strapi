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
  it('renders and matches the snapshot', () => {
    const { container } = render(makeApp(null));

    expect(container).toMatchSnapshot();
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
