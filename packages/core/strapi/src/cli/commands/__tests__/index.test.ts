jest.mock('@strapi/cloud-cli', () => ({
  __esModule: true,
  buildStrapiCloudCommands: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line import/first
import { commands } from '../index';
// eslint-disable-next-line import/first
import { command as userStoriesSyncE2e } from '../user-stories/command';

describe('cli commands registry', () => {
  it('exports a non-empty array of command factories', () => {
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
    commands.forEach((factory) => {
      expect(typeof factory).toBe('function');
    });
  });

  it('registers the user-stories:sync-e2e command factory exactly once', () => {
    const occurrences = commands.filter((factory) => factory === userStoriesSyncE2e);
    expect(occurrences).toHaveLength(1);
  });
});
