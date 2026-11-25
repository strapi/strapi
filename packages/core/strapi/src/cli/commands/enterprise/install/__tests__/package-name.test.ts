import { isValidPackageName } from '../package-name';

describe('isValidPackageName', () => {
  it.each([
    '@strapi-enterprise/plugin-ai-byok',
    '@strapi-enterprise/plugin.v2_beta',
    `@strapi-enterprise/${'a'.repeat(195)}`,
  ])('accepts %s', (packageName) => {
    expect(isValidPackageName(packageName)).toBe(true);
  });

  it.each([
    '@other/plugin-ai-byok',
    'plugin-ai-byok',
    '@strapi-enterprise/',
    '@strapi-enterprise/../x',
    '@strapi-enterprise/Plugin-AI-BYOK',
    '@strapi-enterprise/.hidden',
    '@strapi-enterprise/_hidden',
    '@strapi-enterprise/plugin\u001B[2J',
    '@strapi-enterprise/plugin ai',
    `@strapi-enterprise/${'a'.repeat(196)}`,
  ])('rejects %j', (packageName) => {
    expect(isValidPackageName(packageName)).toBe(false);
  });
});
