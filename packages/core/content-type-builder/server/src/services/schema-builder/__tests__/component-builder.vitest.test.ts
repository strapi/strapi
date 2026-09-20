import { beforeEach, describe, expect, it, vi } from 'vitest';

import createComponentBuilder from '../component-builder';
import createSchemaHandler from '../schema-handler';

const createComponentHandler = ({
  uid,
  displayName,
  collectionName,
}: {
  uid: string;
  displayName: string;
  collectionName: string;
}) =>
  createSchemaHandler({
    uid: uid as any,
    dir: `/tmp/components/${uid.split('.')[0]}`,
    filename: `${uid.split('.')[1]}.json`,
    schema: {
      collectionName,
      info: { displayName },
      options: {},
      attributes: {},
    } as any,
  });

const createBuilder = (components: Array<[string, ReturnType<typeof createSchemaHandler>]>) => ({
  components: new Map(components),
  contentTypes: new Map(),
  convertAttributes: (attributes: Record<string, unknown>) => attributes,
  ...createComponentBuilder(),
});

describe('component-builder rename reuse', () => {
  beforeEach(() => {
    vi.stubGlobal('strapi', {
      dirs: { app: { components: '/tmp/components' } },
      telemetry: { send: vi.fn() },
    });
  });

  it('moves the component identity when its display name changes without changing its table', () => {
    const original = createComponentHandler({
      uid: 'default.hero-text',
      displayName: 'Hero Text',
      collectionName: 'components_default_hero_texts',
    });
    const parent = createSchemaHandler({
      uid: 'api::page.page' as any,
      dir: '/tmp/api/page',
      filename: 'schema.json',
      schema: {
        collectionName: 'pages',
        info: { singularName: 'page', pluralName: 'pages', displayName: 'Page' },
        options: {},
        attributes: {
          hero: { type: 'component', component: 'default.hero-text' },
        },
      } as any,
    });

    const builder = createBuilder([['default.hero-text', original]]);
    builder.contentTypes.set('api::page.page', parent);

    const edited = builder.editComponent({
      uid: 'default.hero-text',
      displayName: 'Headline',
      category: 'default',
      icon: 'bold',
      description: '',
      pluginOptions: {},
      attributes: {},
    });

    expect(edited.uid).toBe('default.headline');
    expect(edited.schema.collectionName).toBe('components_default_hero_texts');
    expect(parent.getAttribute('hero')).toMatchObject({ component: 'default.headline' });
  });

  it('gives a recreated component a distinct table when the old table name is still in use', () => {
    const renamed = createComponentHandler({
      uid: 'default.headline',
      displayName: 'Headline',
      collectionName: 'components_default_hero_texts',
    });

    const builder = createBuilder([['default.headline', renamed]]);

    const recreated = builder.createComponent({
      displayName: 'Hero Text',
      category: 'default',
      icon: 'bold',
      description: '',
      pluginOptions: {},
      attributes: {},
    });

    expect(recreated.uid).toBe('default.hero-text');
    expect(recreated.schema.collectionName).toBe('components_default_hero_texts_1');
    expect(renamed.schema.collectionName).toBe('components_default_hero_texts');
  });
});
