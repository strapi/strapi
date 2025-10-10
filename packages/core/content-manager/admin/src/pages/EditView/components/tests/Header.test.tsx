import { render as renderRTL, screen, waitFor } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Header, HeaderProps } from '../Header';

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
            getDocumentActions: () => [],
            getHeaderActions: () => [],
          },
        },
      },
    })
  ),
}));

describe('Header', () => {
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
      expect(await screen.findByRole('button', { name: 'More actions' })).toBeDisabled()
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
      expect(await screen.findByRole('button', { name: 'More actions' })).toBeDisabled()
    );
  });

  it('should not render any status if there is no prop', async () => {
    render();

    await waitFor(() => expect(screen.queryByText('Draft')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Published')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Modified')).not.toBeInTheDocument());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'More actions' })).toBeDisabled()
    );
  });

  it.todo('should display a back button');
});
