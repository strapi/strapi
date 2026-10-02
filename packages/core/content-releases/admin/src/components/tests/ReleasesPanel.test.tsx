import { renderHook, server, waitFor } from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { useGetReleasesForEntryQuery } from '../../services/release';
import { Panel } from '../ReleasesPanel';

import type { PanelComponentProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({ isLoading: false, allowedActions: { canRead: true } })),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: jest.fn(() => ({ edit: { options: { draftAndPublish: true } } })),
}));

const props = {
  model: 'api::article.article',
  documentId: 'abc',
  document: { documentId: 'abc', id: 1 },
  collectionType: 'collection-types',
} as unknown as PanelComponentProps;

const renderPanel = () =>
  renderHook(() => ({
    panel: Panel(props),
    releases: useGetReleasesForEntryQuery({
      contentType: props.model,
      entryDocumentId: props.documentId,
      locale: undefined,
      hasEntryAttached: true,
    }),
  }));

describe('ReleasesPanel', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeEach(() => {
    window.strapi.isEE = true;
    server.use(
      http.get('/content-releases/getByDocumentAttached', () =>
        HttpResponse.json({
          data: [{ id: 1, name: 'Release 1', actions: [{ id: 1, type: 'publish' }] }],
        })
      )
    );
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('renders the panel with the cms-content-releases feature', async () => {
    window.strapi.features.isEnabled = (name) => name === 'cms-content-releases';

    const { result } = renderPanel();

    await waitFor(() => expect(result.current.panel).not.toBeNull());
  });

  it('renders nothing when the license lacks the cms-content-releases feature', async () => {
    window.strapi.features.isEnabled = () => false;

    const { result } = renderPanel();

    await waitFor(() => expect(result.current.releases.isSuccess).toBe(true));
    expect(result.current.panel).toBeNull();
  });
});
