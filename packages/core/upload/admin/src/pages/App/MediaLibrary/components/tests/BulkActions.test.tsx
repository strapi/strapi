import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { BulkActions } from '../BulkActions';

import type { BulkActionsProps } from '../BulkActions';

jest.mock('../../../../../hooks/useBulkRemove');
jest.mock('../../../../../components/BulkMoveDialog/BulkMoveDialog');

const setup = (
  props: BulkActionsProps = {
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
            <BulkActions {...props} />
          </IntlProvider>
        </MemoryRouter>
      </DesignSystemProvider>
    </QueryClientProvider>
  );
};

describe('BulkActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', async () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });

  test('displays the proper assets and folders count', () => {
    const ASSET_COUNT = 2;
    const FOLDER_COUNT = 8;

    const { getByText } = setup({
      onSuccess: jest.fn(),
      selected: [
        ...[...Array(ASSET_COUNT).keys()].map((index) => ({ id: index, type: 'asset' })),
        ...[...Array(FOLDER_COUNT).keys()].map((index) => ({
          id: index,
          type: 'folder',
          files: { count: 0 },
        })),
      ] as BulkActionsProps['selected'],
    });

    expect(
      getByText(`${FOLDER_COUNT} folders - ${ASSET_COUNT} assets selected`)
    ).toBeInTheDocument();
  });
});
