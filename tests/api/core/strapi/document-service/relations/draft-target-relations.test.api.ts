/**
 * Publishing an entry drops its relations to entries that have no published version yet.
 * Publishing the target later adds the link to the published version of the source.
 */
import type { Core } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ARTICLE_UID = 'api::article.article';
const LABEL_UID = 'api::label.label';
const TOPIC_UID = 'api::topic.topic';
const LINK_COMPONENT_UID = 'default.link';
const NESTED_COMPONENT_UID = 'default.nested';
const NOTE_COMPONENT_UID = 'default.note';

const labelModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Label',
  singularName: 'label',
  pluralName: 'labels',
  description: '',
  collectionName: '',
};

const topicModel = {
  attributes: {
    name: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Topic',
  singularName: 'topic',
  pluralName: 'topics',
  description: '',
  collectionName: '',
};

const nestedComponentModel = {
  collectionName: 'components_default_nesteds',
  attributes: {
    label: { type: 'relation', relation: 'oneToOne', target: LABEL_UID },
  },
  displayName: 'nested',
};

const noteComponentModel = {
  collectionName: 'components_default_notes',
  attributes: {
    text: { type: 'string' },
  },
  displayName: 'note',
};

const linkComponentModel = {
  collectionName: 'components_default_links',
  attributes: {
    marker: { type: 'string' },
    label: { type: 'relation', relation: 'oneToOne', target: LABEL_UID },
    labels: { type: 'relation', relation: 'oneToMany', target: LABEL_UID },
    nested: { type: 'component', component: NESTED_COMPONENT_UID },
  },
  displayName: 'link',
};

const articleModel = {
  attributes: {
    title: { type: 'string' },
    label: { type: 'relation', relation: 'oneToOne', target: LABEL_UID },
    labels: { type: 'relation', relation: 'oneToMany', target: LABEL_UID },
    topic: { type: 'relation', relation: 'oneToOne', target: TOPIC_UID },
    link: { type: 'component', component: LINK_COMPONENT_UID },
    links: { type: 'component', component: LINK_COMPONENT_UID, repeatable: true },
    blocks: { type: 'dynamiczone', components: [NOTE_COMPONENT_UID, LINK_COMPONENT_UID] },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const linkPopulate = {
  populate: {
    label: true,
    labels: true,
    nested: { populate: { label: true } },
  },
};

const populate = {
  label: true,
  labels: true,
  topic: true,
  link: linkPopulate,
  links: linkPopulate,
  blocks: { on: { [NOTE_COMPONENT_UID]: true, [LINK_COMPONENT_UID]: linkPopulate } },
} as const;

const createLabel = async (name: string) => {
  const label = await strapi.documents(LABEL_UID).create({ data: { name } });
  return label.documentId;
};

const findArticle = (documentId: string, status: 'draft' | 'published') =>
  strapi.documents(ARTICLE_UID).findOne({ documentId, status, populate } as any) as Promise<any>;

const names = (entries: { name: string }[] | undefined) =>
  (entries ?? []).map((entry) => entry.name).sort();

describe('Document Service relations to entries published later', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([labelModel, topicModel])
      .addComponent(nestedComponentModel)
      .addComponent(noteComponentModel)
      .addComponent(linkComponentModel)
      .addContentTypes([articleModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'Es', code: 'es' }])
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('adds the links to the published version once the targets are published', async () => {
    const first = await createLabel('first');
    const second = await createLabel('second');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'Article',
        label: { documentId: first },
        labels: [{ documentId: first }, { documentId: second }],
        link: { label: { documentId: first }, nested: { label: { documentId: second } } },
        links: [{ label: { documentId: second } }, { labels: [{ documentId: first }] }],
        blocks: [{ __component: LINK_COMPONENT_UID, label: { documentId: second } }],
      },
    } as any);

    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const publishedBefore = await findArticle(article.documentId, 'published');
    expect(publishedBefore.label).toBeNull();
    expect(publishedBefore.labels).toEqual([]);
    expect(publishedBefore.link.label).toBeNull();
    expect(publishedBefore.link.nested.label).toBeNull();
    expect(publishedBefore.links[0].label).toBeNull();
    expect(publishedBefore.links[1].labels).toEqual([]);
    expect(publishedBefore.blocks[0].label).toBeNull();

    await strapi.documents(LABEL_UID).publish({ documentId: first });
    await strapi.documents(LABEL_UID).publish({ documentId: second });

    const published = await findArticle(article.documentId, 'published');
    expect(published.label).toMatchObject({ name: 'first', publishedAt: expect.any(String) });
    expect(names(published.labels)).toEqual(['first', 'second']);
    expect(published.labels.every((label: any) => label.publishedAt)).toBe(true);
    expect(published.link.label).toMatchObject({ name: 'first' });
    expect(published.link.nested.label).toMatchObject({ name: 'second' });
    expect(published.links[0].label).toMatchObject({ name: 'second' });
    expect(names(published.links[1].labels)).toEqual(['first']);
    expect(published.blocks[0].label).toMatchObject({ name: 'second' });

    const draft = await findArticle(article.documentId, 'draft');
    expect(draft.label).toMatchObject({ name: 'first', publishedAt: null });
    expect(names(draft.labels)).toEqual(['first', 'second']);
    expect(draft.link.nested.label).toMatchObject({ name: 'second', publishedAt: null });
  });

  it('adds the link to a dynamic zone component that follows another component type', async () => {
    const label = await createLabel('zone');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'Zone',
        blocks: [
          { __component: NOTE_COMPONENT_UID, text: 'note' },
          { __component: LINK_COMPONENT_UID, label: { documentId: label } },
        ],
      },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    const published = await findArticle(article.documentId, 'published');
    expect(published.blocks[1].label).toMatchObject({ name: 'zone' });
  });

  it('keeps the draft order of xToMany links', async () => {
    const early = await createLabel('early');
    await strapi.documents(LABEL_UID).publish({ documentId: early });
    const late = await createLabel('late');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Order', labels: [{ documentId: late }, { documentId: early }] },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });
    await strapi.documents(LABEL_UID).publish({ documentId: late });

    const published = await findArticle(article.documentId, 'published');
    expect(published.labels.map((label: any) => label.name)).toEqual(['late', 'early']);
  });

  it('adds the link to every published entry that links to the target', async () => {
    const label = await createLabel('shared');

    const articles = await Promise.all(
      ['one', 'two', 'three'].map((title) =>
        strapi.documents(ARTICLE_UID).create({
          data: { title, labels: [{ documentId: label }] },
        } as any)
      )
    );
    for (const article of articles) {
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });
    }
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    for (const article of articles) {
      const published = await findArticle(article.documentId, 'published');
      expect(names(published.labels)).toEqual(['shared']);
    }
  });

  it('does not add the link to another component after the draft components are reordered', async () => {
    const kept = await createLabel('kept');
    await strapi.documents(LABEL_UID).publish({ documentId: kept });
    const moved = await createLabel('moved');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'Reordered',
        links: [
          { marker: 'first', label: { documentId: kept } },
          { marker: 'second', label: { documentId: moved } },
        ],
      },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const draft = await findArticle(article.documentId, 'draft');
    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      data: {
        links: [
          { id: draft.links[1].id, marker: 'second', label: { documentId: moved } },
          { id: draft.links[0].id, marker: 'first', label: { documentId: kept } },
        ],
      },
    } as any);
    await strapi.documents(LABEL_UID).publish({ documentId: moved });

    const published = await findArticle(article.documentId, 'published');
    expect(published.links.map((link: any) => [link.marker, link.label?.name ?? null])).toEqual([
      ['first', 'kept'],
      ['second', null],
    ]);
  });

  it('does not add the link to a component that cannot be told apart from the reordered one', async () => {
    const kept = await createLabel('kept twin');
    await strapi.documents(LABEL_UID).publish({ documentId: kept });
    const moved = await createLabel('moved twin');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'Twins',
        links: [{ labels: [{ documentId: kept }] }, { labels: [{ documentId: moved }] }],
      },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const draft = await findArticle(article.documentId, 'draft');
    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      data: {
        links: [
          { id: draft.links[1].id, labels: [{ documentId: moved }] },
          { id: draft.links[0].id, labels: [{ documentId: kept }] },
        ],
      },
    } as any);
    await strapi.documents(LABEL_UID).publish({ documentId: moved });

    const published = await findArticle(article.documentId, 'published');
    expect(published.links.map((link: any) => names(link.labels))).toEqual([['kept twin'], []]);
  });

  it('does not duplicate links when a target is published again', async () => {
    const label = await createLabel('republished');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Republish', labels: [{ documentId: label }] },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    await strapi.documents(LABEL_UID).publish({ documentId: label });
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    const published = await findArticle(article.documentId, 'published');
    expect(names(published.labels)).toEqual(['republished']);
  });

  it('adds the link again when a target is unpublished and published again', async () => {
    const label = await createLabel('unpublished');
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Unpublish', label: { documentId: label } },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    await strapi.documents(LABEL_UID).unpublish({ documentId: label });
    expect((await findArticle(article.documentId, 'published')).label).toBeNull();

    await strapi.documents(LABEL_UID).publish({ documentId: label });
    expect((await findArticle(article.documentId, 'published')).label).toMatchObject({
      name: 'unpublished',
    });
  });

  it('keeps the links after the draft is discarded', async () => {
    const label = await createLabel('discarded');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Discard', link: { label: { documentId: label } } },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    await strapi.documents(ARTICLE_UID).discardDraft({ documentId: article.documentId });

    const draft = await findArticle(article.documentId, 'draft');
    expect(draft.link.label).toMatchObject({ name: 'discarded', publishedAt: null });
  });

  it('does not replace the target of an xToOne relation on the published version', async () => {
    const current = await createLabel('current');
    await strapi.documents(LABEL_UID).publish({ documentId: current });
    const next = await createLabel('next');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Existing link', label: { documentId: current } },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      data: { label: { documentId: next } },
    } as any);
    await strapi.documents(LABEL_UID).publish({ documentId: next });

    const published = await findArticle(article.documentId, 'published');
    expect(published.label).toMatchObject({ name: 'current' });

    const draft = await findArticle(article.documentId, 'draft');
    expect(draft.label).toMatchObject({ name: 'next' });
  });

  it('adds the link only when the linked locale of the target is published', async () => {
    const topic = await strapi.documents(TOPIC_UID).create({ data: { name: 'en' }, locale: 'en' });
    await strapi.documents(TOPIC_UID).update({
      documentId: topic.documentId,
      locale: 'es',
      data: { name: 'es' },
    });

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Localized target', topic: { documentId: topic.documentId, locale: 'en' } },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    await strapi.documents(TOPIC_UID).publish({ documentId: topic.documentId, locale: 'es' });
    expect((await findArticle(article.documentId, 'published')).topic).toBeNull();

    await strapi.documents(TOPIC_UID).publish({ documentId: topic.documentId, locale: 'en' });
    expect((await findArticle(article.documentId, 'published')).topic).toMatchObject({
      name: 'en',
      locale: 'en',
    });
  });

  it('does not add links to an entry that has never been published', async () => {
    const label = await createLabel('draft only');

    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Draft only', label: { documentId: label } },
    } as any);
    await strapi.documents(LABEL_UID).publish({ documentId: label });

    expect(await findArticle(article.documentId, 'published')).toBeNull();
    expect((await findArticle(article.documentId, 'draft')).label).toMatchObject({
      name: 'draft only',
    });
  });
});
