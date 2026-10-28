import { describe, expect, test } from 'vitest';

import { restartsServer } from '../file-reset';

describe('restartsServer', () => {
  test.each([
    // Files tests change: the develop watcher restarts on these.
    ['src/api/article/content-types/article/schema.json', true],
    ['src/api/guided-tour/routes/guided-tour.js', true],
    ['src/components/shared/seo.json', true],
    ['src/force-restart-from-playwright-instance.js', true],
    ['config/plugins.js', true],
    ['database/migrations/2026.01.01.js', true],
    ['src/index.js', true],
    // Files Strapi writes itself and the watcher ignores.
    ['types/generated/contentTypes.d.ts', false],
    ['src/extensions/documentation/documentation/1.0.0/full_documentation.json', false],
    ['public/uploads_backup_1793141873338/image.png', false],
    ['.strapi/client/app.js', false],
    ['.tmp/data.db', false],
    ['src/admin/app.js', false],
    ['npm-debug.log', false],
  ])('%s → %s', (filePath, restarts) => {
    expect(restartsServer(filePath)).toBe(restarts);
  });
});
