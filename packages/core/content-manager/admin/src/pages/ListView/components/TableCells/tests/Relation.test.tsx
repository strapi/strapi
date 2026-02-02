import { useQueryParams } from '@strapi/admin/strapi-admin';
import { render as renderRTL, waitFor, screen, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { RelationSingle, RelationMultiple } from '../Relations';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: jest.fn(() => [
    {
      query: {},
    },
  ]),
}));

const render = (component: React.ReactElement) =>
  renderRTL(component, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <Routes>
            <Route path="/content-manager/:collectionType/:slug/*" element={children} />
          </Routes>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::address.address'],
  });

describe('Relation cell content', () => {
  describe('RelationSingle', () => {
    const DEFAULT_PROPS_FIXTURE = {
      mainField: {
        name: 'name',
        type: 'string' as const,
      },
      content: {
        name: '1',
        documentId: 'doc-123',
      },
    };

    it('renders with expected content', async () => {
      const { getByText } = render(<RelationSingle {...DEFAULT_PROPS_FIXTURE} />);

      // We expect to see the content's name value rendered
      expect(getByText('1')).toBeInTheDocument();
    });
  });

  describe('RelationMultiple', () => {
    const DEFAULT_PROPS_FIXTURE = {
      mainField: {
        name: 'name',
        type: 'string' as const,
      },
      content: {
        count: 1,
      },
      name: 'categories.name',
      rowId: 1,
    };

    it('renders and renders the menu when clicked', async () => {
      const { user } = render(<RelationMultiple {...DEFAULT_PROPS_FIXTURE} />);

      expect(await screen.findByRole('button', { name: '1 item' })).toBeInTheDocument();

      await user.click(await screen.findByRole('button', { name: '1 item' }));

      expect(await screen.findByRole('menu')).toBeInTheDocument();

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Relations are loading')).not.toBeInTheDocument();
      });

      // Wait for menu items to appear
      await screen.findByRole('menuitem', { name: 'Relation entity 1' });

      [1, 2, 3].forEach((number) => {
        expect(
          screen.getByRole('menuitem', { name: `Relation entity ${number}` })
        ).toBeInTheDocument();
      });
    });

    it('displays related entities in reversed order', async () => {
      const { user } = render(<RelationMultiple {...DEFAULT_PROPS_FIXTURE} />);

      await user.click(await screen.findByRole('button', { name: '1 item' }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Relations are loading')).not.toBeInTheDocument();
      });

      // Wait for menu items to appear
      await screen.findByRole('menuitem', { name: 'Relation entity 1' });

      // Get all menu items and check order
      const menuItems = screen.getAllByRole('menuitem');

      menuItems.forEach((button, i) => {
        expect(button).toHaveTextContent(`Relation entity ${3 - i}`);
      });
    });

    it('displays relations for the correct locale when locale is provided', async () => {
      const locale = 'fr';
      (useQueryParams as jest.Mock).mockImplementation(() => [
        {
          query: {
            plugins: {
              i18n: {
                locale,
              },
            },
          },
        },
      ]);

      // Mock API to return French locale relations
      server.use(
        rest.get('/content-manager/relations/:model/:id/:targetField', (req, res, ctx) => {
          const url = new URL(req.url);
          const localeParam = url.searchParams.get('locale');

          // Return different relations based on locale
          if (localeParam === 'fr') {
            return res(
              ctx.json({
                pagination: { page: 1, pageCount: 1, pageSize: 10, total: 2 },
                results: [
                  { documentId: '1', name: 'Catégorie française 1' },
                  { documentId: '2', name: 'Catégorie française 2' },
                ],
              })
            );
          }

          // Default: return English relations
          return res(
            ctx.json({
              pagination: { page: 1, pageCount: 1, pageSize: 10, total: 3 },
              results: [
                { documentId: '1', name: 'English Category 1' },
                { documentId: '2', name: 'English Category 2' },
                { documentId: '3', name: 'English Category 3' },
              ],
            })
          );
        })
      );

      const { user } = render(<RelationMultiple {...DEFAULT_PROPS_FIXTURE} />);

      await user.click(await screen.findByRole('button', { name: '1 item' }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Relations are loading')).not.toBeInTheDocument();
      });

      // Verify French relations are displayed
      await screen.findByRole('menuitem', { name: 'Catégorie française 1' });
      expect(screen.getByRole('menuitem', { name: 'Catégorie française 1' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Catégorie française 2' })).toBeInTheDocument();

      // Verify English relations are NOT displayed
      expect(
        screen.queryByRole('menuitem', { name: 'English Category 1' })
      ).not.toBeInTheDocument();
    });

    it('displays relations without locale filtering when locale is not provided', async () => {
      (useQueryParams as jest.Mock).mockImplementation(() => [
        {
          query: {},
        },
      ]);

      // Mock API to return default relations when no locale is provided
      server.use(
        rest.get('/content-manager/relations/:model/:id/:targetField', (req, res, ctx) => {
          return res(
            ctx.json({
              pagination: { page: 1, pageCount: 1, pageSize: 10, total: 3 },
              results: [
                { documentId: '1', name: 'Relation entity 1' },
                { documentId: '2', name: 'Relation entity 2' },
                { documentId: '3', name: 'Relation entity 3' },
              ],
            })
          );
        })
      );

      const { user } = render(<RelationMultiple {...DEFAULT_PROPS_FIXTURE} />);

      await user.click(await screen.findByRole('button', { name: '1 item' }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Relations are loading')).not.toBeInTheDocument();
      });

      // Verify default relations are displayed
      await screen.findByRole('menuitem', { name: 'Relation entity 1' });
      expect(screen.getByRole('menuitem', { name: 'Relation entity 1' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Relation entity 2' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Relation entity 3' })).toBeInTheDocument();
    });
  });
});
