import { generateContentTypesDefinitions } from '../../../generators/content-types';
import { generateComponentsDefinitions } from '../../../generators/components';
import { createLogger } from '../../../generators/utils';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../../generators/utils', () => ({
  ...jest.requireActual('../../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

const contentTypes = {
  'admin::user': {
    uid: 'admin::user',
    modelType: 'contentType',
    kind: 'collectionType',
    collectionName: 'admin_users',
    info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
    options: { draftAndPublish: false },
    attributes: { email: { type: 'email', required: true } },
  },
  'api::article.article': {
    uid: 'api::article.article',
    modelType: 'contentType',
    kind: 'collectionType',
    collectionName: 'articles',
    info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
    options: { draftAndPublish: true },
    attributes: {
      title: { type: 'string', required: true },
      seo: { type: 'component', component: 'shared.seo', repeatable: false },
      author: { type: 'relation', relation: 'manyToOne', target: 'admin::user' },
    },
  },
  'api::homepage.homepage': {
    uid: 'api::homepage.homepage',
    modelType: 'contentType',
    kind: 'singleType',
    collectionName: 'homepages',
    info: { singularName: 'homepage', pluralName: 'homepages', displayName: 'Homepage' },
    attributes: { headline: { type: 'text' } },
  },
};

const components = {
  'shared.seo': {
    uid: 'shared.seo',
    modelType: 'component',
    category: 'shared',
    collectionName: 'components_shared_seos',
    info: { displayName: 'Seo' },
    attributes: { metaTitle: { type: 'string', maxLength: 60 } },
  },
};

const generators = [
  ['content types', generateContentTypesDefinitions, { contentTypes }],
  ['components', generateComponentsDefinitions, { components }],
] as const;

describe.each(generators)('%s generator', (_, generator, strapi) => {
  const logger = createLogger({ silent: true });

  test('without strict types, output equals the develop output', async () => {
    const { output } = await generator({ strapi, logger, strict: false });

    // The snapshot was produced by the generator of develop (4372c19516) for the same input.
    expect(output).toMatchSnapshot();
  });

  test('without the strict option, output equals the output without strict types', async () => {
    const { output: implicit } = await generator({ strapi, logger });
    const { output: explicit } = await generator({ strapi, logger, strict: false });

    expect(implicit).toBe(explicit);
  });

  test('with strict types, schemas augment the global Strapi.Registries namespace', async () => {
    const { output } = await generator({ strapi, logger, strict: true });
    const { output: legacy } = await generator({ strapi, logger, strict: false });

    expect(output).toMatchSnapshot();
    expect(output).toContain('declare global');
    expect(output).toMatch(/namespace Strapi\s*{\s*namespace Registries\s*{/);
    expect(output).not.toContain("declare module '@strapi/strapi'");
    expect(output).not.toContain('Public');
    // Only the extension block differs: the schema interfaces and imports are shared.
    const body = (content: string) => content.slice(0, content.indexOf('declare '));
    expect(body(output)).toBe(body(legacy));
  });

  test('with strict types and no schemas, output is the placeholder', async () => {
    const { output } = await generator({ strapi: {}, logger, strict: true });
    const { output: legacy } = await generator({ strapi: {}, logger, strict: false });

    expect(output).toBe(legacy);
    expect(output).not.toContain('declare');
  });
});

describe('duplicate interface names', () => {
  const contentType = (uid: string) => ({
    uid,
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'baz', pluralName: 'bazs', displayName: 'Baz' },
    attributes: { title: { type: 'string' } },
  });
  const component = (uid: string, category: string) => ({
    uid,
    modelType: 'component',
    category,
    info: { displayName: 'Baz' },
    attributes: { title: { type: 'string' } },
  });

  test.each([
    [
      generateContentTypesDefinitions,
      {
        contentTypes: {
          'api::foo-bar.baz': contentType('api::foo-bar.baz'),
          'api::foo.bar-baz': contentType('api::foo.bar-baz'),
        },
      },
      'ApiFooBarBaz',
    ],
    [
      generateComponentsDefinitions,
      {
        components: {
          'foo-bar.baz': component('foo-bar.baz', 'foo-bar'),
          'foo.bar-baz': component('foo.bar-baz', 'foo'),
        },
      },
      'FooBarBaz',
    ],
  ] as const)('warn without renaming the interfaces (%#)', async (generator, strapi, name) => {
    const logger = createLogger({ silent: true });
    const { output } = await generator({ strapi, logger, strict: false });

    expect(logger.warnings).toBe(1);
    // The names are unchanged: both declarations keep the shared name.
    expect(output.match(new RegExp(`export interface ${name} `, 'g'))).toHaveLength(2);
  });

  test('do not warn for distinct names', async () => {
    const logger = createLogger({ silent: true });
    await generateContentTypesDefinitions({ strapi: { contentTypes }, logger, strict: false });
    await generateComponentsDefinitions({ strapi: { components }, logger, strict: false });

    expect(logger.warnings).toBe(0);
  });
});
