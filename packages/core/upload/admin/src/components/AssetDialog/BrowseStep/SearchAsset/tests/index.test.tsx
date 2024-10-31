import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent } from '@testing-library/react';
import { render } from '@tests/utils';
import { IntlProvider } from 'react-intl';
import type { Query } from '../../../../../../../shared/contracts/files';

import SearchAsset from '../index';

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
    const { container } = render(makeApp(queryValue));

    const input: HTMLInputElement | null = container.querySelector('input[name="search"]');

    expect(input).toBeInTheDocument();
    expect(input?.value).toEqual(queryValue);
  });

  it('should call handleChange when submitting search input', async () => {
    const { container, user } = render(makeApp(null));

    const button = container.querySelector('button');

    if (button) {
      await user.click(button);
    }
    const input: HTMLInputElement | null = container.querySelector('input[name="search"]');

    if (input) {
      fireEvent.change(input, { target: { value: 'michka' } });
      fireEvent.submit(input);
    }

    expect(handleChange.mock.calls.length).toBe(1);
  });
});
