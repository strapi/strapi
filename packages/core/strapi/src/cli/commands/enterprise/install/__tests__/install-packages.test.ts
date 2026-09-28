import { buildInstallCommand } from '../install-packages';

const SPECS = ['@strapi-enterprise/plugin-ai-byok@1.2.0'];

describe('buildInstallCommand', () => {
  it('keeps the exact version with npm, which would otherwise save a ^ range', () => {
    expect(buildInstallCommand({ name: 'npm', majorVersion: 10 }, SPECS)).toEqual({
      command: 'npm',
      args: ['install', '--save-exact', ...SPECS],
    });
  });

  it.each(['pnpm', 'yarn'] as const)('uses %s add, which saves an exact version as is', (name) => {
    expect(buildInstallCommand({ name, majorVersion: 4 }, SPECS)).toEqual({
      command: name,
      args: ['add', ...SPECS],
    });
  });
});
