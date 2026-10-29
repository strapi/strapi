import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { ProtectedEditViewPage } from '../EditViewPage';

/**
 * Header and Panels pull in document actions registered by plugins, which are not part of
 * what is under test here (the form and its initial errors).
 */
jest.mock('../components/Header', () => ({
  Header: () => null,
}));

jest.mock('../components/Panels', () => ({
  ...jest.requireActual('../components/Panels'),
  Panels: () => null,
  ActionsPanelContent: () => null,
}));

const MODEL = 'api::thing.thing';
const DOCUMENT_ID = 'thing-1';

const contentType = {
  uid: MODEL,
  isDisplayed: true,
  apiID: 'thing',
  kind: 'collectionType',
  info: { displayName: 'Thing', singularName: 'thing', pluralName: 'things' },
  options: { draftAndPublish: true },
  pluginOptions: {},
  attributes: {
    id: { type: 'string' },
    documentId: { type: 'string' },
    title: { type: 'string', required: true },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
    publishedAt: { type: 'datetime' },
  },
};

const configuration = {
  contentType: {
    uid: MODEL,
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
      title: {
        edit: { label: 'title', description: '', placeholder: '', visible: true, editable: true },
        list: { label: 'title', searchable: true, sortable: true },
      },
    },
    layouts: {
      list: ['title'],
      edit: [[{ name: 'title', size: 6 }]],
    },
  },
  components: {},
};

const permissions = ['read', 'update', 'publish'].map((action) => ({
  id: action,
  action: `plugin::content-manager.explorer.${action}`,
  subject: MODEL,
  properties: action === 'publish' ? {} : { fields: ['title'] },
  conditions: [],
  actionParameters: {},
}));

const renderEditView = (state?: Record<string, unknown>) =>
  render(
    <Routes>
      <Route
        path="/content-manager/:collectionType/:slug/:id"
        element={<ProtectedEditViewPage />}
      />
    </Routes>,
    {
      initialEntries: [
        { pathname: `/content-manager/collection-types/${MODEL}/${DOCUMENT_ID}`, state },
      ],
      providerOptions: { permissions },
    }
  );

describe('EditViewPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({ data: { components: [], contentTypes: [contentType] } })
      ),
      // the model uid contains `::`, which msw would read as path params, so match it as one
      http.get('/content-manager/content-types/:model/configuration', () =>
        HttpResponse.json({ data: configuration })
      ),
      http.get('/content-manager/collection-types/:model/:id', () =>
        HttpResponse.json({
          data: {
            id: 1,
            documentId: DOCUMENT_ID,
            title: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            publishedAt: null,
            status: 'draft',
          },
          meta: { availableLocales: [], availableStatus: [] },
        })
      )
    );
  });

  it('shows publish validation errors straight away when navigated to with forceValidation', async () => {
    renderEditView({ forceValidation: true });

    await screen.findByRole('textbox', { name: /title/ });

    expect(screen.getByText('This value is required.')).toBeInTheDocument();
  });

  it('keeps forceValidation when a locale saved by an earlier visit is restored into the URL', async () => {
    window.localStorage.setItem(
      'STRAPI_LOCALE',
      JSON.stringify({ plugins: { i18n: { locale: 'en' } } })
    );

    renderEditView({ forceValidation: true });

    await screen.findByRole('textbox', { name: /title/ });

    expect(screen.getByText('This value is required.')).toBeInTheDocument();
  });

  it('does not show validation errors initially without forceValidation', async () => {
    renderEditView();

    await screen.findByRole('textbox', { name: /title/ });

    expect(screen.queryByText('This value is required.')).not.toBeInTheDocument();
  });
});
