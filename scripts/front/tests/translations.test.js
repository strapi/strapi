'use strict';

const path = require('path');
const fs = require('fs');
const { extractPackageUsages, runtimeIdToEnKey } = require('../translations/extract-usages');
const { analyzePackage } = require('../translations/analyze-package');
const { runTranslationsSyncEn } = require('../translations/sync-en');

const fixturePackageConfig = {
  packageDir: path.join(__dirname, 'fixtures/translations/sample-package'),
  pluginId: 'sample-plugin',
  prefix: 'sample-plugin.',
  translationHelpers: ['getTranslation'],
  enJsonPath: path.join(
    __dirname,
    'fixtures/translations/sample-package/admin/src/translations/en.json'
  ),
  sourceDir: path.join(__dirname, 'fixtures/translations/sample-package/admin/src'),
};

describe('translations tooling', () => {
  it('extracts static translation usages from AST', () => {
    const usages = extractPackageUsages(fixturePackageConfig);
    const staticUsages = usages.filter((usage) => usage.type === 'usage');

    expect(staticUsages.map((usage) => usage.enKey)).toEqual(
      expect.arrayContaining([
        'sample.greeting',
        'sample.missing',
        'sample.mismatch',
        'plugin.name',
      ])
    );
    expect(usages.some((usage) => usage.dynamic)).toBe(true);
  });

  it('maps runtime ids to en.json keys', () => {
    expect(runtimeIdToEnKey('sample-plugin.sample.greeting', 'sample-plugin.')).toBe(
      'sample.greeting'
    );
  });

  it('reports missing and mismatched en.json keys', () => {
    const analysis = analyzePackage(fixturePackageConfig);

    expect(analysis.issues.missingFromEn.map(({ enKey }) => enKey)).toContain('sample.missing');
    expect(analysis.issues.valueMismatch.map(({ enKey }) => enKey)).toContain('sample.mismatch');
    expect(analysis.issues.missingDefaultMessage.map(({ enKey }) => enKey)).toContain(
      'plugin.name'
    );
    expect(analysis.issues.dynamicIds.length).toBeGreaterThan(0);
  });

  it('syncs missing and mismatched keys from defaultMessage', () => {
    const enJsonPath = fixturePackageConfig.enJsonPath;
    const original = fs.readFileSync(enJsonPath, 'utf8');

    try {
      runTranslationsSyncEn({
        write: true,
        packageConfigs: [fixturePackageConfig],
      });

      const updated = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));
      expect(updated['sample.missing']).toBe('Missing key');
      expect(updated['sample.mismatch']).toBe('From code');
    } finally {
      fs.writeFileSync(enJsonPath, original);
    }
  });
});
