'use strict';

const getPluginsPath = require('../get-plugins-path');

describe('getPluginsPath', () => {
  test('should return an array of directories that contains an admin/src/index.js file', () => {
    const results = getPluginsPath();

    expect(results.length).toBeGreaterThan(0);
    // Test that the content-type-builder is included
    expect(results.findIndex((p) => p.includes('/core/content-type-builder/admin'))).not.toEqual(
      -1
    );
    // Test that the upload is included
    expect(results.findIndex((p) => p.includes('/core/upload/admin'))).not.toEqual(-1);
    // Test that the documentation is included
    expect(results.findIndex((p) => p.includes('/plugins/documentation/admin'))).not.toEqual(-1);
    // Test that the CM is not included
    expect(results.findIndex((p) => p.includes('/core/content-manager/admin'))).toEqual(-1);
    // Test that the admin package is not included
    expect(results.findIndex((p) => p.includes('/core/admin/admin'))).toEqual(-1);
    // Test that the helper-plugin package is not included
    expect(results.findIndex((p) => p.includes('helper-plugin'))).toEqual(-1);
  });
});
