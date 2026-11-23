import { describe, expect, it, vi } from 'vitest';
import { machineIdSync } from 'node-machine-id';

import { generateInstallId } from '../install-id';

vi.mock('node-machine-id', () => ({ machineIdSync: vi.fn(() => 'the-machine-id') }));

const SHA256_HEX = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('generateInstallId', () => {
  it('returns the install id when it is set', () => {
    expect(generateInstallId('the-project-id', 'the-install-id')).toBe('the-install-id');
  });

  it('hashes the machine id and project id when the install id is undefined', () => {
    const installId = generateInstallId('the-project-id', undefined);

    expect(installId).toMatch(SHA256_HEX);
    expect(generateInstallId('the-project-id', undefined)).toBe(installId);
  });

  it('returns a random UUID when both the project id and install id are undefined', () => {
    expect(generateInstallId(undefined, undefined)).toMatch(UUID);
  });

  it('returns a random UUID when the machine id cannot be read', () => {
    vi.mocked(machineIdSync).mockImplementationOnce(() => {
      throw new Error('no machine id');
    });

    expect(generateInstallId('the-project-id', undefined)).toMatch(UUID);
  });
});
