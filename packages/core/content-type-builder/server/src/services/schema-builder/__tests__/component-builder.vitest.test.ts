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

  it('keeps an existing component identity stable when only its display name changes', () => {
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

    expect(edited.uid).toBe('default.hero-text');
    expect(edited.schema.collectionName).toBe('components_default_hero_texts');
    expect(parent.getAttribute('hero')).toMatchObject({ component: 'default.hero-text' });
  });

  it('gives a recreated display name a distinct internal identity and table', () => {
    const renamed = createComponentHandler({
      uid: 'default.hero-text',
      displayName: 'Headline',
      collectionName: 'components_default_hero_texts',
    });

    const builder = createBuilder([['default.hero-text', renamed]]);

    const recreated = builder.createComponent({
      displayName: 'Hero Text',
      category: 'default',
      icon: 'bold',
      description: '',
      pluginOptions: {},
      attributes: {},
    });

    expect(recreated.uid).toBe('default.hero-text-1');
    expect(recreated.schema.collectionName).toBe('components_default_hero_texts_1');
    expect(renamed.uid).toBe('default.hero-text');
    expect(renamed.schema.collectionName).toBe('components_default_hero_texts');
  });

  it('still rejects a duplicate current display name', () => {
    const existing = createComponentHandler({
      uid: 'default.hero-text-1',
      displayName: 'Hero Text',
      collectionName: 'components_default_hero_texts_1',
    });

    const builder = createBuilder([['default.hero-text-1', existing]]);

    expect(() =>
      builder.createComponent({
        displayName: 'Hero Text',
        category: 'default',
        icon: 'bold',
        description: '',
        pluginOptions: {},
        attributes: {},
      })
    ).toThrow('component.alreadyExists');
  });
});
