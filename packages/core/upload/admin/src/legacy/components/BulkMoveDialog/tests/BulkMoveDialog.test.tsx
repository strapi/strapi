import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider, Modal } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { BulkMoveDialog, BulkMoveDialogProps } from '../BulkMoveDialog';

jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../hooks/useBulkMove');

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const ComponentFixture = (props: BulkMoveDialogProps) => {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <NotificationsProvider>
            <Modal.Root open>
              <BulkMoveDialog {...props} />
            </Modal.Root>
          </NotificationsProvider>
        </DesignSystemProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
};

function setup(props = { onClose: jest.fn(), selected: [] }) {
  return render(<ComponentFixture {...props} />, { container: document.getElementById('app')! });
}

describe('BulkMoveDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders and matches the snapshot', () => {
    setup();
    expect(document.body).toMatchSnapshot();
  });
});
