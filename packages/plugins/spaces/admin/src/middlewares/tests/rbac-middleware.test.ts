import { workspaceEntryLockMiddleware } from '../rbac-middleware';
import { getCurrentSpaceSlug } from '../../utils/currentSpace';
import { fetchEntryState } from '../../utils/entryStates';

import type { Permission } from '@strapi/admin/strapi-admin';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'acme'),
}));

jest.mock('../../utils/entryStates', () => ({
  fetchEntryState: jest.fn(),
}));

const ARTICLE = 'api::article.article';
const PAGE = 'api::page.page';

const permission = (action: string, subject: string) =>
  ({ id: `${action}-${subject}`, action, subject, properties: {}, conditions: [] }) as Permission;

const PERMISSIONS = [
  permission('plugin::content-manager.explorer.read', ARTICLE),
  permission('plugin::content-manager.explorer.update', ARTICLE),
  permission('plugin::content-manager.explorer.delete', ARTICLE),
  permission('plugin::content-manager.explorer.publish', ARTICLE),
  permission('plugin::content-manager.explorer.update', PAGE),
];

const run = (pathname: string) =>
  workspaceEntryLockMiddleware({ pathname, search: '', permissions: PERMISSIONS })(
    (permissions) => permissions
  )(PERMISSIONS);

describe('workspaceEntryLockMiddleware', () => {
  beforeEach(() => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');
    jest.mocked(fetchEntryState).mockReset();
  });

  it('strips update/delete/publish of the locked model only', async () => {
    jest.mocked(fetchEntryState).mockResolvedValue({
      space: null,
      editable: false,
      reason: 'shared-entry',
    });

    const result = await run(`/content-manager/collection-types/${ARTICLE}/abc`);

    expect(fetchEntryState).toHaveBeenCalledWith(ARTICLE, 'abc');
    expect(result.map((p) => `${p.action}@${p.subject}`)).toEqual([
      `plugin::content-manager.explorer.read@${ARTICLE}`,
      `plugin::content-manager.explorer.update@${PAGE}`,
    ]);
  });

  it('passes editable and unknown entries through', async () => {
    jest.mocked(fetchEntryState).mockResolvedValueOnce({
      space: { id: 2, slug: 'acme', name: 'Acme', color: null },
      editable: true,
    });
    expect(await run(`/content-manager/collection-types/${ARTICLE}/abc`)).toBe(PERMISSIONS);

    jest.mocked(fetchEntryState).mockResolvedValueOnce(null);
    expect(await run(`/content-manager/collection-types/${ARTICLE}/abc`)).toBe(PERMISSIONS);
  });

  it('ignores routes that are not an existing document', async () => {
    expect(await run(`/content-manager/collection-types/${ARTICLE}`)).toBe(PERMISSIONS);
    expect(await run(`/content-manager/collection-types/${ARTICLE}/create`)).toBe(PERMISSIONS);
    expect(await run('/settings/workspaces')).toBe(PERMISSIONS);
    expect(fetchEntryState).not.toHaveBeenCalled();
  });

  it('is a passthrough in the default workspace', async () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');

    expect(await run(`/content-manager/collection-types/${ARTICLE}/abc`)).toBe(PERMISSIONS);
    expect(fetchEntryState).not.toHaveBeenCalled();
  });
});
