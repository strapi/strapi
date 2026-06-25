'use strict';

const { execSync } = require('child_process');

const {
  isLatestV4Alias,
  resolveStrapiVersion,
  materializeScenarioVersions,
} = require('../../framework/resolve-strapi-version');
const { buildScenarioFromFlags } = require('../../framework/build-scenario');

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('isLatestV4Alias', () => {
  test.each(['legacy', 'latest-v4', ' Legacy ', 'LATEST-V4'])('treats %j as latest v4', (value) => {
    expect(isLatestV4Alias(value)).toBe(true);
  });

  test.each(['4.26.2', '5.7.0', ''])('does not treat %j as latest v4', (value) => {
    expect(isLatestV4Alias(value)).toBe(false);
  });
});

describe('resolveStrapiVersion', () => {
  beforeEach(() => {
    execSync.mockReset();
  });

  test('passes concrete semver through unchanged', () => {
    expect(resolveStrapiVersion('4.26.2')).toBe('4.26.2');
    expect(execSync).not.toHaveBeenCalled();
  });

  test('resolves legacy via npm dist-tag', () => {
    execSync.mockReturnValue('4.26.2\n');
    expect(resolveStrapiVersion('legacy')).toBe('4.26.2');
    expect(execSync).toHaveBeenCalledWith('npm view @strapi/strapi@legacy version', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  });
});

describe('materializeScenarioVersions', () => {
  beforeEach(() => {
    execSync.mockReset();
    execSync.mockReturnValue('4.26.2\n');
  });

  test('replaces legacy on v4-scaffold baseline', () => {
    const scenario = {
      id: 'test',
      baseline: { type: 'v4-scaffold', initialVersion: 'legacy' },
      stages: [],
    };
    materializeScenarioVersions(scenario);
    expect(scenario.baseline.initialVersion).toBe('4.26.2');
    expect(scenario.baseline.requestedInitialVersion).toBe('legacy');
  });

  test('leaves v5-pinned baseline untouched', () => {
    const scenario = {
      id: 'test',
      baseline: { type: 'v5-pinned', initialVersion: '5.7.0' },
      stages: [],
    };
    materializeScenarioVersions(scenario);
    expect(scenario.baseline.initialVersion).toBe('5.7.0');
    expect(execSync).not.toHaveBeenCalled();
  });
});

describe('buildScenarioFromFlags', () => {
  test('accepts legacy as v4 initial', () => {
    const scenario = buildScenarioFromFlags({ initial: 'legacy', via: [] });
    expect(scenario.baseline.type).toBe('v4-scaffold');
    expect(scenario.baseline.initialVersion).toBe('legacy');
  });
});
