import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { BulkMoveButton } from '../components/BulkMoveButton';
import { useBulkMove } from '../../../hooks/useBulkMove';

jest.mock('../../../hooks/useBulkMove');
jest.mock('../../../hooks/useFolderStructure');

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
            <BulkMoveButton {...props} />
          </IntlProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('BulkMoveButton', () => {
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
    const moveSpy = jest.fn().mockResolvedValueOnce({});

    useBulkMove.mockReturnValueOnce({
      isLoading: false,
      error: null,
      move: moveSpy,
    });

    act(() => {
      fireEvent.click(getByText('Move'));
    });

    expect(getByText('Move elements to')).toBeInTheDocument();

    act(() => {
      const dialog = screen.getByRole('dialog');
      const submit = within(dialog).getByRole('button', {
        name: /move/i,
      });
      fireEvent.click(submit);
    });

    waitFor(() => expect(moveSpy).toBeCalledWith(null));
    waitFor(() => expect(onSuccessSpy).toBeCalled());
  });

  // TODO: test case of error
});
