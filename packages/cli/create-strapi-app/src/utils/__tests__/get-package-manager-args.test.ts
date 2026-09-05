import execa from 'execa';

import { getInstallArgs, getPackageManagerFromUserAgent } from '../get-package-manager-args';

jest.mock('execa');

const mockedExeca = execa as unknown as jest.Mock;

describe('getInstallArgs', () => {
  beforeEach(() => {
    mockedExeca.mockReset();
  });

  it('does not pass --legacy-peer-deps for npm', async () => {
    mockedExeca.mockResolvedValue({ stdout: '10.9.2' });

    const { cmdArgs } = await getInstallArgs('npm');

    expect(cmdArgs).toEqual(['install']);
    expect(cmdArgs).not.toContain('--legacy-peer-deps');
  });

  it('keeps yarn classic network timeout', async () => {
    mockedExeca.mockResolvedValue({ stdout: '1.22.22' });

    const { cmdArgs } = await getInstallArgs('yarn');

    expect(cmdArgs).toEqual(['install', '--network-timeout', '1000000']);
  });

  it('does not add extra args for yarn 4+', async () => {
    mockedExeca.mockResolvedValue({ stdout: '4.12.0' });

    const { cmdArgs, envArgs } = await getInstallArgs('yarn');

    expect(cmdArgs).toEqual(['install']);
    expect(envArgs).toEqual({ YARN_HTTP_TIMEOUT: '1000000' });
  });

  it('does not add extra args for pnpm', async () => {
    mockedExeca.mockResolvedValue({ stdout: '10.25.0' });

    const { cmdArgs } = await getInstallArgs('pnpm');

    expect(cmdArgs).toEqual(['install']);
  });

  it('does not add extra args or env for nub', async () => {
    mockedExeca.mockResolvedValue({ stdout: '0.6.0' });

    const { cmdArgs, envArgs } = await getInstallArgs('nub');

    expect(cmdArgs).toEqual(['install']);
    expect(envArgs).toEqual({});
  });
});

describe('getPackageManagerFromUserAgent', () => {
  it('detects nub before the npm compatibility segment', () => {
    expect(getPackageManagerFromUserAgent('nub/0.6.0 npm/? node/v22.15.0 darwin arm64')).toBe('nub');
  });

  it('detects pnpm', () => {
    expect(getPackageManagerFromUserAgent('pnpm/10.25.0 npm/? node/v22.15.0')).toBe('pnpm');
  });

  it('returns null for an unknown or empty user agent', () => {
    expect(getPackageManagerFromUserAgent('npm/10.9.2 node/v22.15.0')).toBeNull();
    expect(getPackageManagerFromUserAgent('')).toBeNull();
  });
});
