import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { BulkDeleteButton } from '../components/BulkDeleteButton';
import { useBulkRemove } from '../../../hooks/useBulkRemove';

jest.mock('../../../hooks/useBulkRemove');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn().mockReturnValue({ push() {} }),
  useLocation: jest.fn().mockReturnValue({ pathname: '' }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest
    .fn()
    .mockReturnValue([
      { query: { page: '', pageSize: '', assetsCount: '' }, rawQuery: '' },
      jest.fn(),
    ]),
}));

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
    const push = jest.fn();
    const stringify = jest.fn();
    const page = 2;
    const pageSize = 10;
    const pathname = '/plugins/upload';

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
    waitFor(() =>
      expect(push({ pathname, search: stringify({ page, pageSize }) })).toBeCalledTimes(1)
    );
    waitFor(() => expect(onSuccessSpy).toBeCalledTimes(1));
  });
});
