const isAuthenticated = 'admin::isAuthenticatedAdmin';

const withPermissions = (actions: string[]) => ({
  name: 'admin::hasPermissions',
  config: { actions },
});

// Common policy sets
const authOnly = [isAuthenticated];

const canReadSettings = [isAuthenticated, withPermissions(['plugin::upload.settings.read'])];
const canReadAssets = [isAuthenticated, withPermissions(['plugin::upload.read'])];
const canUpdateAssets = [isAuthenticated, withPermissions(['plugin::upload.assets.update'])];
const canCreateAssets = [isAuthenticated, withPermissions(['plugin::upload.assets.create'])];

type Route = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
  config: { policies: unknown[] };
};

const makeRoute = (
  method: Route['method'],
  path: string,
  handler: string,
  policies: unknown[]
): Route => ({
  method,
  path,
  handler,
  config: { policies },
});

export const routes = {
  type: 'admin',
  routes: [
    makeRoute('GET', '/settings', 'admin-settings.getSettings', canReadSettings),
    makeRoute('PUT', '/settings', 'admin-settings.updateSettings', canReadSettings),

    makeRoute('POST', '/', 'admin-upload.upload', authOnly),

    makeRoute('GET', '/files', 'admin-file.find', canReadAssets),
    makeRoute('GET', '/files/:id', 'admin-file.findOne', canReadAssets),
    makeRoute('DELETE', '/files/:id', 'admin-file.destroy', canUpdateAssets),

    makeRoute('GET', '/folders/:id', 'admin-folder.findOne', canReadAssets),
    makeRoute('GET', '/folders', 'admin-folder.find', canReadAssets),
    makeRoute('POST', '/folders', 'admin-folder.create', canCreateAssets),
    makeRoute('PUT', '/folders/:id', 'admin-folder.update', canUpdateAssets),

    makeRoute('GET', '/folder-structure', 'admin-folder.getStructure', canReadAssets),

    makeRoute('POST', '/actions/bulk-delete', 'admin-folder-file.deleteMany', canUpdateAssets),
    makeRoute('POST', '/actions/bulk-move', 'admin-folder-file.moveMany', canUpdateAssets),
    makeRoute('POST', '/actions/bulk-update', 'admin-upload.bulkUpdateFileInfo', canUpdateAssets),
  ],
};
