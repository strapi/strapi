import { mergeInfoConfig } from '../merge-info-config';

describe('mergeInfoConfig', () => {
  it('always sets generation date', () => {
    const result = mergeInfoConfig(undefined);

    expect(result['x-generation-date']).toEqual(expect.any(String));
  });

  it('uses configured info fields', () => {
    const result = mergeInfoConfig({
      version: '2.0.0',
      title: 'Custom API',
      description: 'Custom description',
    });

    expect(result.version).toBe('2.0.0');
    expect(result.title).toBe('Custom API');
    expect(result.description).toBe('Custom description');
  });

  it('omits version, title and description when not configured', () => {
    const result = mergeInfoConfig(undefined);

    expect(result.version).toBeUndefined();
    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('includes contact and license only when configured', () => {
    const result = mergeInfoConfig({
      contact: {
        name: 'Team',
        email: 'team@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    });

    expect(result.contact).toEqual({
      name: 'Team',
      email: 'team@example.com',
    });
    expect(result.license).toEqual({
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    });
  });

  it('omits contact and license when not configured', () => {
    const result = mergeInfoConfig(undefined);

    expect(result.contact).toBeUndefined();
    expect(result.license).toBeUndefined();
    expect(result.termsOfService).toBeUndefined();
  });

  it('omits contact and license when configured with empty values', () => {
    const result = mergeInfoConfig({
      contact: {
        name: '',
        email: '',
        url: '',
      },
      license: {
        name: '',
        url: '',
      },
    });

    expect(result.contact).toBeUndefined();
    expect(result.license).toBeUndefined();
  });
});
