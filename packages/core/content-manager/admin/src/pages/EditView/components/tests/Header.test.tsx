import { render as renderRTL, screen, waitFor, fireEvent } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Header, HeaderProps } from '../Header';

let getDocumentActionsReturn: unknown[] = [];

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((name, getter) =>
    getter({
      plugins: {
        'content-manager': {
          initializer: jest.fn(),
          injectionZones: {},
          isReady: true,
          name: 'content-manager',
          pluginId: 'content-manager',
          injectComponent: jest.fn(),
          getInjectedComponents: jest.fn(),
          apis: {
            getDocumentActions: () => getDocumentActionsReturn,
            getHeaderActions: () => [],
          },
        },
      },
    })
  ),
}));

const useDocMock = jest.fn();

jest.mock('../../../../hooks/useDocument', () => ({
  useDoc: (...args: unknown[]) => useDocMock(...args),
  useDocument: jest.fn(),
  useContentManagerContext: jest.fn(),
}));

const defaultUseDocReturnForCreate = {
  collectionType: 'collection-types',
  model: 'api::address.address',
  id: undefined,
  document: undefined,
  meta: undefined,
  components: {},
  schema: {},
  isLoading: false,
  refetch: jest.fn(),
  getTitle: jest.fn(),
  getInitialFormValues: jest.fn(),
  validate: jest.fn(),
  hasError: false,
  schemas: [],
};

describe('Header', () => {
  beforeEach(() => {
    useDocMock.mockReturnValue(defaultUseDocReturnForCreate);
  });
  const render = (props?: Partial<HeaderProps>) =>
    renderRTL(<Header {...props} />, {
      initialEntries: ['/content-manager/collection-types/api::address.address/create'],
      renderOptions: {
        wrapper({ children }) {
          return (
            <Routes>
              <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
            </Routes>
          );
        },
      },
    });

  it('should render the create entry title when isCreating is true', async () => {
    const { rerender } = render({ isCreating: true, status: 'draft' });

    expect(await screen.findByRole('heading', { name: 'Create an entry' })).toBeInTheDocument();
    expect(await screen.findByText('Draft')).toBeInTheDocument();

    rerender(<Header />);

    expect(await screen.findByRole('heading', { name: 'Untitled' })).toBeInTheDocument();

    rerender(<Header title="Richmond AFC appoint new manager" />);

    expect(
      await screen.findByRole('heading', { name: 'Richmond AFC appoint new manager' })
    ).toBeInTheDocument();

    await waitFor(async () =>
      expect(await screen.findByRole('button', { name: 'More actions' })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    );
  });

  it('should display the status of the document', async () => {
    const { rerender } = render({ status: 'draft' });

    expect(await screen.findByText('Draft')).toBeInTheDocument();

    rerender(<Header status="published" />);

    expect(await screen.findByText('Published')).toBeInTheDocument();

    rerender(<Header status="modified" />);

    expect(await screen.findByText('Modified')).toBeInTheDocument();

    await waitFor(async () =>
      expect(await screen.findByRole('button', { name: 'More actions' })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    );
  });

  it('should not render any status if there is no prop', async () => {
    render();

    await waitFor(() => expect(screen.queryByText('Draft')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Published')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Modified')).not.toBeInTheDocument());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'More actions' })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    );
  });

  it.todo('should display a back button');

  describe('Copy document ID and Document ID in Information', () => {
    const defaultUseDocReturn = {
      collectionType: 'collection-types',
      model: 'api::address.address',
      id: 'doc-123',
      document: { id: 1, documentId: 'doc-123' },
      meta: {},
      components: {},
      schema: {},
      isLoading: false,
      refetch: jest.fn(),
    };

    const singleTypeUseDocReturn = {
      ...defaultUseDocReturn,
      collectionType: 'single-types',
      document: { id: 1, documentId: 'doc-123' },
    };

    beforeEach(() => {
      getDocumentActionsReturn = [
        () => ({ label: 'Edit the model', icon: null, position: 'header' }),
      ];
    });

    afterEach(() => {
      getDocumentActionsReturn = [];
      useDocMock.mockReset();
    });

    it('shows Copy document ID button and Document ID row for collection types when documentId is available', async () => {
      useDocMock.mockImplementation(() => defaultUseDocReturn);

      const { user } = render({ status: 'draft' });

      const moreActionsButton = await screen.findByRole('button', {
        name: 'More actions',
      });
      await waitFor(() => expect(moreActionsButton).not.toHaveAttribute('aria-disabled', 'true'));

      await user.click(moreActionsButton);

      expect(await screen.findByText('Copy document ID')).toBeInTheDocument();
      expect(screen.getByText('Document ID')).toBeInTheDocument();
      expect(screen.getByText('doc-123')).toBeInTheDocument();
    });

    it('does not show Copy document ID button or Document ID row for single types', async () => {
      useDocMock.mockImplementation(() => singleTypeUseDocReturn);

      const { user } = render({ status: 'draft' });

      const moreActionsButton = await screen.findByRole('button', {
        name: 'More actions',
      });
      await waitFor(() => expect(moreActionsButton).not.toHaveAttribute('aria-disabled', 'true'));

      await user.click(moreActionsButton);

      expect(screen.queryByText('Copy document ID')).not.toBeInTheDocument();
      expect(screen.queryByText('Document ID')).not.toBeInTheDocument();
    });

    it('shows Document ID row when id is from URL but document is undefined (e.g. creating in another locale)', async () => {
      useDocMock.mockImplementation(() => ({
        ...defaultUseDocReturn,
        document: undefined,
        meta: undefined,
        id: 'doc-123',
      }));

      const { user } = render({ status: 'draft' });

      const moreActionsButton = await screen.findByRole('button', {
        name: 'More actions',
      });
      await waitFor(() => expect(moreActionsButton).not.toHaveAttribute('aria-disabled', 'true'));

      await user.click(moreActionsButton);

      expect(await screen.findByText('Copy document ID')).toBeInTheDocument();
      expect(screen.getByText('Document ID')).toBeInTheDocument();
      expect(screen.getByText('doc-123')).toBeInTheDocument();
    });

    it('copies document ID to clipboard and shows success notification on click', async () => {
      useDocMock.mockImplementation(() => defaultUseDocReturn);
      const { user } = render({ status: 'draft' });

      await user.click(await screen.findByRole('button', { name: 'More actions' }));
      await user.click(await screen.findByText('Copy document ID'));

      expect(await screen.findByText('Document ID copied to clipboard')).toBeInTheDocument();
    });
  });
});
