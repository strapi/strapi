import { render as renderRTL, screen, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { Filters } from '../Filters';

import type { Schema } from '../../../../hooks/useDocument';

const baseMockSchema: Schema = {
  uid: 'api::article.article',
  apiID: 'article',
  kind: 'collectionType',
  info: {
    singularName: 'article',
    pluralName: 'articles',
    displayName: 'Article',
    description: '',
  },
  options: {},
  attributes: {
    id: { type: 'string' },
    documentId: { type: 'string' },
    title: { type: 'string' },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
  },
  isDisplayed: true,
  pluginOptions: {},
};

const mockSchemaWithDraftAndPublish: Schema = {
  ...baseMockSchema,
  options: { draftAndPublish: true },
};

const mockSchemaWithoutDraftAndPublish: Schema = {
  ...baseMockSchema,
  options: { draftAndPublish: false },
};

const mockContentTypeConfiguration = {
  contentType: {
    uid: 'api::article.article',
    settings: {
      bulkable: true,
      filterable: true,
      searchable: true,
      pageSize: 10,
      mainField: 'title',
      defaultSortBy: 'title',
      defaultSortOrder: 'ASC',
    },
    metadatas: {
      id: {
        edit: {},
        list: { label: 'id', searchable: true, sortable: true },
      },
      documentId: {
        edit: {},
        list: { label: 'documentId', searchable: true, sortable: true },
      },
      title: {
        edit: { label: 'title', description: '', placeholder: '', visible: true, editable: true },
        list: { label: 'title', searchable: true, sortable: true },
      },
      createdAt: {
        edit: {},
        list: { label: 'createdAt', searchable: true, sortable: true },
      },
      updatedAt: {
        edit: {},
        list: { label: 'updatedAt', searchable: true, sortable: true },
      },
    },
    layouts: {
      list: ['id', 'title'],
      edit: [],
    },
  },
  components: {},
};

const render = (schema: Schema) =>
  renderRTL(<Filters schema={schema} />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <Routes>
            <Route path="/content-manager/:collectionType/:slug" element={children} />
          </Routes>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::article.article'],
  });

describe('Filters', () => {
  beforeEach(() => {
    server.use(
      rest.get('/content-manager/content-types/:model/configuration', (req, res, ctx) => {
        return res(ctx.json({ data: mockContentTypeConfiguration }));
      }),
      rest.get('/content-manager/init', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              components: [],
              contentTypes: [baseMockSchema],
            },
          })
        );
      })
    );
  });

  describe('Status filter', () => {
    it('should display the status filter when draftAndPublish is enabled', async () => {
      const { user } = render(mockSchemaWithDraftAndPublish);

      // Open the filters popover
      const filterButton = await screen.findByRole('button', { name: 'Filters' });
      await user.click(filterButton);

      // Find the field select and check for Status option
      const fieldSelect = await screen.findByRole('combobox', { name: 'Select field' });
      await user.click(fieldSelect);

      // Status should be in the list of filter options
      expect(await screen.findByRole('option', { name: 'Status' })).toBeInTheDocument();

      // Close popover
      await user.click(document.body);
    });

    it('should NOT display the status filter when draftAndPublish is disabled', async () => {
      const { user } = render(mockSchemaWithoutDraftAndPublish);

      // Open the filters popover
      const filterButton = await screen.findByRole('button', { name: 'Filters' });
      await user.click(filterButton);

      // Find the field select
      const fieldSelect = await screen.findByRole('combobox', { name: 'Select field' });
      await user.click(fieldSelect);

      // Status should NOT be in the list of filter options
      expect(screen.queryByRole('option', { name: 'Status' })).not.toBeInTheDocument();

      // Close popover
      await user.click(document.body);
    });

    it('should show Draft and Published as status filter operators', async () => {
      const { user } = render(mockSchemaWithDraftAndPublish);

      // Open the filters popover
      const filterButton = await screen.findByRole('button', { name: 'Filters' });
      await user.click(filterButton);

      // Select the Status field
      const fieldSelect = await screen.findByRole('combobox', { name: 'Select field' });
      await user.click(fieldSelect);

      const statusOption = await screen.findByRole('option', { name: 'Status' });
      await user.click(statusOption);

      // Open the filter/operator select
      const filterSelect = await screen.findByRole('combobox', { name: 'Select filter' });
      await user.click(filterSelect);

      // Should have Draft and Published options
      expect(await screen.findByRole('option', { name: 'Draft' })).toBeInTheDocument();
      expect(await screen.findByRole('option', { name: 'Published' })).toBeInTheDocument();

      // Close popover
      await user.click(document.body);
    });
  });
});

