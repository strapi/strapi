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

describe('conditional attributes', () => {
  const conditions = { visible: { '==': [{ var: 'kind' }, 'blog'] } };
  const withConditions = (attributeConditions?: object) => ({
    contentTypes: {
      'api::post.post': {
        uid: 'api::post.post',
        modelType: 'contentType',
        kind: 'collectionType',
        collectionName: 'posts',
        info: { singularName: 'post', pluralName: 'posts', displayName: 'Post' },
        options: { draftAndPublish: true },
        attributes: {
          kind: { type: 'enumeration', enum: ['news', 'blog'] },
          teaser: { type: 'text', required: true, conditions: attributeConditions },
        },
      },
    },
  });

  test('without strict types, conditions do not change the output', async () => {
    const logger = createLogger({ silent: true });
    const { output } = await generateContentTypesDefinitions({
      strapi: withConditions(conditions),
      logger,
      strict: false,
    });
    const { output: unconditional } = await generateContentTypesDefinitions({
      strapi: withConditions(),
      logger,
      strict: false,
    });

    expect(output).toBe(unconditional);
    expect(output).not.toContain('Conditional');
  });

  test('with strict types, a conditional attribute carries the marker', async () => {
    const logger = createLogger({ silent: true });
    const { output } = await generateContentTypesDefinitions({
      strapi: withConditions(conditions),
      logger,
      strict: true,
    });

    expect(output).toContain(
      'teaser: Schema.Attribute.Text & Schema.Attribute.Required & Schema.Attribute.Conditional;'
    );
    expect(output).toContain('kind: Schema.Attribute.Enumeration<');
    expect(output.match(/Schema\.Attribute\.Conditional/g)).toHaveLength(1);
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

  test.each([
    [
      generateContentTypesDefinitions,
      {
        contentTypes: {
          // Loaded out of order: names follow the UIDs' code unit order.
          'api::foo.bar-baz': contentType('api::foo.bar-baz'),
          'api::foo-bar.baz': contentType('api::foo-bar.baz'),
          // Already uses the first suffix, which is then skipped.
          'api::foo-bar.baz2': contentType('api::foo-bar.baz2'),
        },
      },
      'ApiFooBarBaz',
      ['api::foo-bar.baz', 'api::foo.bar-baz'],
    ],
    [
      generateComponentsDefinitions,
      {
        components: {
          'foo.bar-baz': component('foo.bar-baz', 'foo'),
          'foo-bar.baz': component('foo-bar.baz', 'foo-bar'),
          'foo-bar.baz2': component('foo-bar.baz2', 'foo-bar'),
        },
      },
      'FooBarBaz',
      ['foo-bar.baz', 'foo.bar-baz'],
    ],
  ] as const)(
    'with strict types, rename the later colliding interfaces (%#)',
    async (generator, strapi, name, [first, second]) => {
      const logger = createLogger({ silent: true });
      const { output } = await generator({ strapi, logger, strict: true });

      expect(logger.warnings).toBe(1);
      expect(output.match(new RegExp(`export interface ${name} `, 'g'))).toHaveLength(1);
      expect(output.match(new RegExp(`export interface ${name}2 `, 'g'))).toHaveLength(1);
      expect(output.match(new RegExp(`export interface ${name}3 `, 'g'))).toHaveLength(1);
      expect(output).toContain(`'${first}': ${name};`);
      expect(output).toContain(`'${second}': ${name}3;`);
    }
  );

  test('do not warn for distinct names', async () => {
    const logger = createLogger({ silent: true });
    await generateContentTypesDefinitions({ strapi: { contentTypes }, logger, strict: false });
    await generateComponentsDefinitions({ strapi: { components }, logger, strict: false });

    expect(logger.warnings).toBe(0);
  });
});
