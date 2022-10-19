import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { BulkDeleteButton } from '../components/BulkDeleteButton';
import { useBulkRemove } from '../../../../hooks/useBulkRemove';

jest.mock('../../../../hooks/useBulkRemove');

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
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <IntlProvider locale="en">
            <BulkDeleteButton {...props} />
          </IntlProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('BulkDeleteButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('opens confirm dialog before the API call', () => {
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

    act(() => {
      fireEvent.click(getByText('Delete'));
    });

    expect(getByText('Are you sure you want to delete this?')).toBeInTheDocument();

    act(() => {
      fireEvent.click(getByText('Confirm'));
    });

    expect(removeSpy).toBeCalledWith([{ type: 'asset' }]);
    waitFor(() => expect(onSuccessSpy).toBeCalledTimes(1));
  });
});
