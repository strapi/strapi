import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { useBulkRemove } from '../../../../../hooks/useBulkRemove';
import { BulkDeleteButton } from '../BulkDeleteButton';

jest.mock('../../../../../hooks/useBulkRemove');

const setup = (
  props = {
    selected: [],
    onSuccess: jest.fn(),
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <MemoryRouter>
          <IntlProvider locale="en">
            <BulkDeleteButton {...props} />
          </IntlProvider>
        </MemoryRouter>
      </DesignSystemProvider>
    </QueryClientProvider>
  );
};

const user = userEvent.setup();

describe('BulkDeleteButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('opens confirm dialog before the API call', async () => {
    const onSuccessSpy = jest.fn();
    const { getByText } = setup({
      onSuccess: onSuccessSpy,
      selected: [{ type: 'asset' }],
    });
    const removeSpy = jest.fn().mockResolvedValueOnce({});

    useBulkRemove.mockReturnValueOnce({
      isLoading: false,
      error: null,
      remove: removeSpy,
    });

    await user.click(getByText('Delete'));

    expect(getByText('Are you sure?')).toBeInTheDocument();

    await user.click(getByText('Confirm'));

    waitFor(() => expect(onSuccessSpy).toBeCalledTimes(1));
  });
});
