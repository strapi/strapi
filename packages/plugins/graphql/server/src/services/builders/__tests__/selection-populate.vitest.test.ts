import { describe, expect, it } from 'vitest';

import { selectionPopulate } from '../selection-populate';

const ARTICLE = 'api::article.article';
const TAG = 'api::tag.tag';
const FOLDER = 'api::folder.folder';
const SEO = 'shared.seo';
const HERO = 'blocks.hero';
const QUOTE = 'blocks.quote';

const models: Record<string, any> = {
  [ARTICLE]: {
    uid: ARTICLE,
    attributes: {
      title: { type: 'string' },
      tags: { type: 'relation', relation: 'manyToMany', target: TAG },
      folder: { type: 'relation', relation: 'manyToOne', target: FOLDER },
      related: { type: 'relation', relation: 'morphToMany' },
      cover: { type: 'media' },
      seo: { type: 'component', component: SEO },
      blocks: { type: 'dynamiczone', components: [HERO, QUOTE] },
    },
  },
  [TAG]: {
    uid: TAG,
    attributes: {
      label: { type: 'string' },
      articles: { type: 'relation', relation: 'manyToMany', target: ARTICLE },
    },
  },
  [FOLDER]: { uid: FOLDER, attributes: { name: { type: 'string' } } },
  'plugin::upload.file': {
    uid: 'plugin::upload.file',
    attributes: {
      name: { type: 'string' },
      related: { type: 'relation', relation: 'morphToMany' },
    },
  },
  [SEO]: { uid: SEO, attributes: { title: { type: 'string' }, image: { type: 'media' } } },
  [HERO]: {
    uid: HERO,
    attributes: { heading: { type: 'string' }, tags: { type: 'relation', target: TAG } },
  },
  [QUOTE]: { uid: QUOTE, attributes: { text: { type: 'string' } } },
};

const typeNames: Record<string, string> = {
  [HERO]: 'ComponentBlocksHero',
  [QUOTE]: 'ComponentBlocksQuote',
};

const makeStrapi = (graphqlNaming = true) =>
  ({
    getModel: (uid: string) => models[uid],
    plugin: () => ({
      service: () => ({
        naming: {
          getComponentName(component: { uid: string }) {
            if (!graphqlNaming) {
              throw new Error('no naming');
            }

            return typeNames[component.uid];
          },
        },
      }),
    }),
  }) as any;

const field = (name: string, ...selections: any[]) => ({
  kind: 'Field',
  name: { value: name },
  ...(selections.length > 0 ? { selectionSet: { selections } } : {}),
});

const inline = (typeName: string | undefined, ...selections: any[]) => ({
  kind: 'InlineFragment',
  ...(typeName ? { typeCondition: { name: { value: typeName } } } : {}),
  selectionSet: { selections },
});

const spread = (name: string) => ({ kind: 'FragmentSpread', name: { value: name } });

const run = (selections: any[], fragments: Record<string, any> = {}, strapi = makeStrapi()) =>
  selectionPopulate(strapi, models[ARTICLE], {
    fieldNodes: [{ kind: 'Field', selectionSet: { selections } }],
    fragments,
  });

describe('selectionPopulate', () => {
  it('is empty when nothing but scalar fields is selected, or there is no selection', () => {
    expect(run([field('title'), field('documentId')])).toEqual({});
    expect(selectionPopulate(makeStrapi(), models[ARTICLE], undefined)).toEqual({});
    expect(selectionPopulate(makeStrapi(), models[ARTICLE], { fieldNodes: [] })).toEqual({});
  });

  it('populates a relation, with `true` when only its scalars are read', () => {
    expect(run([field('folder', field('name'))])).toEqual({ folder: true });
  });

  it('reads a relation below another one, at every depth', () => {
    expect(run([field('tags', field('label'), field('articles', field('folder')))])).toEqual({
      tags: { populate: { articles: { populate: { folder: true } } } },
    });
  });

  it('reads the entries of a connection under `nodes`, and ignores the rest of it', () => {
    expect(
      run([
        field(
          'tags_connection',
          field('nodes', field('articles')),
          field('pageInfo', field('total'))
        ),
      ])
    ).toEqual({ tags: { populate: { articles: true } } });
  });

  it('populates a media field', () => {
    expect(run([field('cover', field('name'))])).toEqual({ cover: true });
  });

  it('populates a component and what it holds', () => {
    expect(run([field('seo', field('title'), field('image'))])).toEqual({
      seo: { populate: { image: true } },
    });
  });

  it('leaves a polymorphic relation out: its resolver refuses it', () => {
    expect(run([field('related', field('id')), field('folder')])).toEqual({ folder: true });
  });

  it('skips a field the type does not have', () => {
    expect(run([field('nothing', field('tags'))])).toEqual({});
  });

  it('reads the fields of an inline fragment and of a spread fragment', () => {
    const fragments = { Parts: inline('Article', field('folder')) };

    expect(run([inline(undefined, field('tags')), spread('Parts')], fragments)).toEqual({
      tags: true,
      folder: true,
    });
  });

  it('reads a dynamic zone by component, from the fragments typed for each one', () => {
    expect(
      run([
        field(
          'blocks',
          inline('ComponentBlocksHero', field('heading'), field('tags')),
          inline('ComponentBlocksQuote', field('text'))
        ),
      ])
    ).toEqual({ blocks: { on: { [HERO]: { populate: { tags: true } } } } });
  });

  it('keeps a fragment of another component out of a component of the zone', () => {
    expect(run([field('blocks', inline('ComponentBlocksQuote', field('text')))])).toEqual({
      blocks: true,
    });
  });

  it('populates a dynamic zone with `true` when no component reads a relation', () => {
    expect(run([field('blocks', field('__typename'))])).toEqual({ blocks: true });
  });

  it('skips a component whose GraphQL type name cannot be found', () => {
    expect(
      run([field('blocks', inline('ComponentBlocksHero', field('tags')))], {}, makeStrapi(false))
    ).toEqual({ blocks: true });
  });

  it('reads only the first field node of the resolver', () => {
    const info = {
      fieldNodes: [
        { kind: 'Field', selectionSet: { selections: [field('folder')] } },
        { kind: 'Field', selectionSet: { selections: [field('tags')] } },
      ],
    };

    expect(selectionPopulate(makeStrapi(), models[ARTICLE], info as any)).toEqual({ folder: true });
  });
});
