import * as React from 'react';

import { StrapiAppContextValue, StrapiAppProvider } from '@strapi/helper-plugin';
import { render as renderRTL, screen, waitFor } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { DocumentActionComponent } from '../../../../../core/apis/content-manager';
import { Panels, ActionsPanel } from '../Panels';

const SearchDisplay = () => {
  const { search } = useLocation();

  return <span data-testid="search-display">{search}</span>;
};

const DEFAULT_CM_PLUGIN = {
  initializer: jest.fn(),
  injectionZones: {},
  isReady: true,
  name: 'content-manager',
  pluginId: 'content-manager',
  getInjectedComponents: jest.fn(),
  apis: {},
} satisfies StrapiAppContextValue['plugins'][string];

describe('Panels', () => {
  const render = (plugins: StrapiAppContextValue['plugins']) =>
    renderRTL(<Panels />, {
      initialEntries: ['/content-manager/collection-types/api::address.address/create'],
      renderOptions: {
        wrapper: ({ children }) => (
          <>
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <StrapiAppProvider
                    menu={[]}
                    settings={{}}
                    plugins={plugins}
                    getPlugin={jest.fn()}
                    getAdminInjectedComponents={jest.fn()}
                    runHookParallel={jest.fn()}
                    runHookSeries={jest.fn()}
                    runHookWaterfall={jest.fn()}
                  >
                    {children}
                  </StrapiAppProvider>
                }
              />
            </Routes>
            <SearchDisplay />
          </>
        ),
      },
    });

  it('should render nothing given there are no panels from the StrapiApp', async () => {
    render({
      ['content-manager']: {
        ...DEFAULT_CM_PLUGIN,
        apis: {
          getEditViewSidePanels: () => [],
        },
      },
    });

    expect(screen.queryAllByRole('heading')).toHaveLength(0);

    await screen.findByTestId('search-display');
  });

  it('should render panels that exist on the StrapiApp', async () => {
    render({
      ['content-manager']: {
        ...DEFAULT_CM_PLUGIN,
        apis: {
          getEditViewSidePanels: () => [
            () => ({
              title: 'Panel 1',
              content: <div>hello</div>,
            }),
            () => ({
              title: 'Panel 2',
              content: <div>world</div>,
            }),
          ],
        },
      },
    });

    await waitFor(() => expect(screen.getAllByRole('heading')).toHaveLength(2));

    expect(screen.getByRole('heading', { name: 'Panel 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Panel 2' })).toBeInTheDocument();
  });

  describe('default panels', () => {
    describe('ActionsPanel', () => {
      const render = ({
        actions = [],
        injectedComponents = [],
      }: { actions?: DocumentActionComponent[]; injectedComponents?: any[] } = {}) =>
        renderRTL(<Panels />, {
          initialEntries: ['/content-manager/collection-types/api::address.address/create'],
          renderOptions: {
            wrapper: ({ children }) => (
              <>
                <Routes>
                  <Route
                    path="/content-manager/:collectionType/:slug/:id"
                    element={
                      <StrapiAppProvider
                        menu={[]}
                        settings={{}}
                        plugins={{
                          ['content-manager']: {
                            ...DEFAULT_CM_PLUGIN,
                            apis: {
                              getEditViewSidePanels: () => [ActionsPanel],
                              getDocumentActions: () => actions,
                            },
                          },
                        }}
                        getPlugin={jest.fn()}
                        getAdminInjectedComponents={jest.fn().mockReturnValue(injectedComponents)}
                        runHookParallel={jest.fn()}
                        runHookSeries={jest.fn()}
                        runHookWaterfall={jest.fn()}
                      >
                        {children}
                      </StrapiAppProvider>
                    }
                  />
                </Routes>
                <SearchDisplay />
              </>
            ),
          },
        });

      it('should render the title correctly and no actions if there are no actions on the StrapiApp', async () => {
        render();

        await screen.findByRole('heading', { name: 'Entry' });

        expect(screen.queryAllByRole('button')).toHaveLength(0);
      });

      it('should render any document actions that exist on the StrapiApp', async () => {
        render({
          actions: [
            () => ({
              label: 'Action 1',
              onClick: jest.fn(),
            }),
            () => ({
              label: 'Action 2',
              onClick: jest.fn(),
            }),
          ],
        });

        await screen.findByRole('heading', { name: 'Entry' });

        expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
      });

      it('should render any additional injection-zone components that use the `editview.right-links` zone', async () => {
        render({
          injectedComponents: [
            {
              name: 'TestComponent',
              Component: () => <p>hello world</p>,
            },
          ],
        });

        await screen.findByRole('heading', { name: 'Entry' });

        expect(screen.getByText('hello world')).toBeInTheDocument();
      });
    });
  });
});
