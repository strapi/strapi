import { render, screen } from '@tests/utils';

import { BulkActionsRenderer, DEFAULT_BULK_ACTIONS } from '../Actions';

const DEFAULT_CM_PLUGIN = {
  initializer: jest.fn(),
  injectionZones: {},
  isReady: true,
  name: 'content-manager',
  pluginId: 'content-manager',
  getInjectedComponents: jest.fn(),
  apis: {
    getBulkActions: () => DEFAULT_BULK_ACTIONS,
  },
};

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTableContext: jest.fn(() => ({
    selectedEntries: [1, 2],
    setSelectedEntries: jest.fn(),
  })),
  useStrapiApp: jest.fn(() => ({
    plugins: {
      'content-manager': DEFAULT_CM_PLUGIN,
    },
  })),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest
    .fn()
    .mockReturnValue({ collectionType: 'collection-types', slug: 'api::category.category' }),
}));

describe('BulkActionsRenderer', () => {
  it('should render default bulk delete action', () => {
    render(<BulkActionsRenderer />);
    //TODO: mock allowed actions
    expect(screen.getByRole('button', { name: /\bDelete\b/ })).toBeInTheDocument();
  });
});
