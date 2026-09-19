import { useRBAC, type Permission } from '@strapi/admin/strapi-admin';
import { render, screen, server, waitFor } from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { PERMISSIONS } from '../../constants';
import { Panel } from '../ReleasesPanel';

import type { PanelComponentProps } from '@strapi/content-manager/strapi-admin';

let mockDraftAndPublish = true;

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  ...jest.requireActual('@strapi/content-manager/strapi-admin'),
  unstable_useDocumentLayout: () => ({
    edit: { options: { draftAndPublish: mockDraftAndPublish } },
  }),
}));

const props: PanelComponentProps = {
  model: 'api::article.article',
  document: { id: 1, documentId: 'article-1' },
  documentId: 'article-1',
  collectionType: 'collection-types',
  activeTab: 'draft',
};

const release = {
  id: 7,
  name: 'September release',
  scheduledAt: null,
  timezone: null,
  releasedAt: null,
  actions: [{ id: 12, type: 'publish' }],
};

const TestPanel = (panelProps: PanelComponentProps) => {
  const { isLoading } = useRBAC(PERMISSIONS);
  const panel = Panel(panelProps);

  return (
    <div data-testid="release-panel" data-permissions-loading={isLoading}>
      {panel?.content}
    </div>
  );
};

// Use the admin provider directly: the local test helper grants every release permission.
// The callback replaces the default permissions rather than adding to them.
const renderPanel = (permissions: Permission[], overrides: Partial<PanelComponentProps> = {}) =>
  render(<TestPanel {...props} {...overrides} />, {
    providerOptions: { permissions: () => permissions },
  });

const expectHiddenPanel = async () => {
  await waitFor(() => {
    expect(screen.getByTestId('release-panel')).toHaveAttribute('data-permissions-loading', 'false');
  });
  expect(screen.queryByText(release.name)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Release action options' })).not.toBeInTheDocument();
};

describe('ReleasesPanel permissions', () => {
  const originalIsEE = window.strapi.isEE;

  beforeEach(() => {
    window.strapi.isEE = true;
    mockDraftAndPublish = true;
    server.use(
      http.get('*/content-releases/getByDocumentAttached', () =>
        HttpResponse.json({ data: [release] })
      )
    );
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
  });

  test('allows editing a release without permission to remove entries', async () => {
    const { user } = renderPanel([...PERMISSIONS.main, ...PERMISSIONS.update]);

    expect(await screen.findByText(release.name)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Release action options' }));

    expect(await screen.findByRole('menuitem', { name: 'Edit release' })).toHaveAttribute(
      'href',
      '/plugins/content-releases/7'
    );
    expect(screen.queryByRole('menuitem', { name: 'Remove from release' })).not.toBeInTheDocument();
  });

  test('keeps both actions available when both permissions are granted', async () => {
    const { user } = renderPanel([
      ...PERMISSIONS.main,
      ...PERMISSIONS.update,
      ...PERMISSIONS.deleteAction,
    ]);

    await user.click(await screen.findByRole('button', { name: 'Release action options' }));

    expect(await screen.findByRole('menuitem', { name: 'Edit release' })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Remove from release' })).toBeInTheDocument();
  });

  test('retains the removal action for a user with only removal permission', async () => {
    const remove = jest.fn(() => HttpResponse.json({ data: { id: 12 } }));
    server.use(http.delete('*/content-releases/7/actions/12', remove));
    const { user } = renderPanel([...PERMISSIONS.main, ...PERMISSIONS.deleteAction]);

    await user.click(await screen.findByRole('button', { name: 'Release action options' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove from release' }));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  });

  test.each([
    { name: 'read-only', permissions: PERMISSIONS.main },
    { name: 'add-entry-only', permissions: [...PERMISSIONS.main, ...PERMISSIONS.createAction] },
  ])('does not offer a menu for a $name user', async ({ permissions }) => {
    renderPanel(permissions);

    expect(await screen.findByText(release.name)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release action options' })).not.toBeInTheDocument();
  });

  test('still requires permission to read releases', async () => {
    renderPanel([...PERMISSIONS.update, ...PERMISSIONS.deleteAction]);
    await expectHiddenPanel();
  });

  test('still requires draft and publish to be enabled', async () => {
    mockDraftAndPublish = false;
    renderPanel([...PERMISSIONS.main, ...PERMISSIONS.update, ...PERMISSIONS.deleteAction]);
    await expectHiddenPanel();
  });

  test('still hides the panel in the community edition', async () => {
    window.strapi.isEE = false;
    renderPanel([...PERMISSIONS.main, ...PERMISSIONS.update, ...PERMISSIONS.deleteAction]);
    await expectHiddenPanel();
  });

  test('still hides the panel for a new collection entry', async () => {
    renderPanel([...PERMISSIONS.main, ...PERMISSIONS.update, ...PERMISSIONS.deleteAction], {
      document: undefined,
      documentId: 'create',
    });
    await expectHiddenPanel();
  });
});
