/**
 * Publishing an entry drops its relations to entries that have no published version yet. The
 * dropped links are recorded when the source is published. Publishing the target later adds
 * exactly the recorded links to the published source and removes the records.
 *
 * Rule: publishing B restores a link on live A only if A's last publish had that link and dropped
 * it because B had no published version. Edits made to the draft of A after its publish reach live
 * A only when A is published again.
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
    nested: { populate: { label: true } },
  },
};

const populate = {
  label: true,
  labels: true,
  topic: true,
  links: linkPopulate,
  blocks: { on: { [NOTE_COMPONENT_UID]: true, [LINK_COMPONENT_UID]: linkPopulate } },
} as const;

const createLabel = async (name: string, publish = false) => {
  const label = await strapi.documents(LABEL_UID).create({ data: { name } });
  if (publish) {
    await strapi.documents(LABEL_UID).publish({ documentId: label.documentId });
  }
  return label.documentId;
};

const publishLabel = (documentId: string) => strapi.documents(LABEL_UID).publish({ documentId });

const createArticle = async (data: Record<string, unknown>) => {
  const article = await strapi.documents(ARTICLE_UID).create({ data } as any);
  return article.documentId;
};

const updateArticle = (documentId: string, data: Record<string, unknown>) =>
  strapi.documents(ARTICLE_UID).update({ documentId, data } as any);

const publishArticle = (documentId: string) =>
  strapi.documents(ARTICLE_UID).publish({ documentId });

const findArticle = (documentId: string, status: 'draft' | 'published') =>
  strapi.documents(ARTICLE_UID).findOne({ documentId, status, populate } as any) as Promise<any>;

const ids = (entries: { documentId: string }[] | undefined) =>
  (entries ?? []).map((entry) => entry.documentId);

const names = (entries: { name: string }[] | undefined) =>
  (entries ?? []).map((entry) => entry.name).sort();

// Converts a populated component back to the input accepted by the Document Service
const toLinkInput = (link: any, overrides: Record<string, unknown> = {}) => ({
  marker: link.marker,
  ...(link.label ? { label: { documentId: link.label.documentId } } : {}),
  ...(link.nested?.label
    ? { nested: { label: { documentId: link.nested.label.documentId } } }
    : {}),
  ...overrides,
});

describe('Document Service relations dropped at publish and restored when the target is published', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([labelModel, topicModel])
      .addComponent(nestedComponentModel)
      .addComponent(noteComponentModel)
      .addComponent(linkComponentModel)
      .addContentTypes([articleModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'Fr', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('does not add a link that was added to the draft after the source was published', async () => {
    const c = await createLabel('c');
    const a = await createArticle({ title: 'A' });
    await publishArticle(a);

    await updateArticle(a, { label: { documentId: c } });
    await publishLabel(c);

    expect((await findArticle(a, 'published')).label).toBeNull();
    expect((await findArticle(a, 'draft')).label).toMatchObject({ documentId: c });

    // The draft change reaches the published version only when the source is published again
    await publishArticle(a);
    expect((await findArticle(a, 'published')).label).toMatchObject({
      documentId: c,
      publishedAt: expect.any(String),
    });
  });

  it('restores a link that was removed from the draft after the source was published', async () => {
    const b = await createLabel('b');
    const a = await createArticle({ title: 'A', label: { documentId: b } });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).label).toBeNull();

    await updateArticle(a, { label: null });
    expect((await findArticle(a, 'draft')).label).toBeNull();

    await publishLabel(b);

    expect((await findArticle(a, 'published')).label).toMatchObject({ documentId: b });
    expect((await findArticle(a, 'draft')).label).toBeNull();
  });

  it('restores the link on the published repeatable component instance that had it', async () => {
    const b = await createLabel('b');
    const other = await createLabel('other', true);
    const a = await createArticle({
      title: 'A',
      links: [
        { marker: 'm1', label: { documentId: other } },
        { marker: 'm2', label: { documentId: b } },
        { marker: 'm3' },
      ],
    });
    await publishArticle(a);

    const before = await findArticle(a, 'published');
    expect(before.links.map((l: any) => l.marker)).toEqual(['m1', 'm2', 'm3']);
    expect(before.links[1].label).toBeNull();

    // Reorder, edit the scalar fields, remove one instance and add new ones in the draft
    const draft = await findArticle(a, 'draft');
    const [d1, d2, d3] = draft.links;
    expect(d2.label).toMatchObject({ documentId: b });
    await updateArticle(a, {
      links: [
        { marker: 'new-first' },
        toLinkInput(d3, { marker: 'edited-m3' }),
        toLinkInput(d1, { marker: 'edited-m1' }),
        toLinkInput(d2, { marker: 'edited-m2' }),
        { marker: 'new-last' },
      ],
    });

    await publishLabel(b);

    const published = await findArticle(a, 'published');
    expect(published.links.map((l: any) => l.marker)).toEqual(['m1', 'm2', 'm3']);
    expect(published.links[0].label).toMatchObject({ documentId: other });
    expect(published.links[1].label).toMatchObject({ documentId: b });
    expect(published.links[2].label).toBeNull();
  });

  it('restores the link on the published dynamic zone component instance that had it', async () => {
    const b = await createLabel('b');
    const a = await createArticle({
      title: 'A',
      blocks: [
        { __component: NOTE_COMPONENT_UID, text: 'note' },
        { __component: LINK_COMPONENT_UID, marker: 'z1' },
        { __component: LINK_COMPONENT_UID, marker: 'z2', label: { documentId: b } },
      ],
    });
    await publishArticle(a);

    const before = await findArticle(a, 'published');
    expect(before.blocks).toHaveLength(3);
    expect(before.blocks[2]).toMatchObject({ marker: 'z2', label: null });

    const draft = await findArticle(a, 'draft');
    const [note, z1, z2] = draft.blocks;
    await updateArticle(a, {
      blocks: [
        { __component: LINK_COMPONENT_UID, ...toLinkInput(z2, { marker: 'edited-z2' }) },
        { __component: NOTE_COMPONENT_UID, text: 'edited note' },
        { __component: LINK_COMPONENT_UID, ...toLinkInput(z1, { marker: 'edited-z1' }) },
        { __component: LINK_COMPONENT_UID, marker: 'extra' },
      ],
    });
    expect(note.text).toBe('note');

    await publishLabel(b);

    const published = await findArticle(a, 'published');
    expect(published.blocks).toHaveLength(3);
    const byMarker = (marker: string) => published.blocks.find((x: any) => x.marker === marker);
    expect(byMarker('z2').label).toMatchObject({ documentId: b });
    expect(byMarker('z1').label).toBeNull();
    expect(published.blocks.filter((x: any) => x.label).length).toBe(1);
  });

  it('restores a link of a nested component on the right nested instance', async () => {
    const b = await createLabel('b');
    const a = await createArticle({
      title: 'A',
      links: [
        { marker: 'n1', nested: {} },
        { marker: 'n2', nested: { label: { documentId: b } } },
      ],
    });
    await publishArticle(a);

    const before = await findArticle(a, 'published');
    expect(before.links[1].nested.label).toBeNull();

    const draft = await findArticle(a, 'draft');
    const [d1, d2] = draft.links;
    await updateArticle(a, {
      links: [toLinkInput(d2, { marker: 'edited-n2' }), toLinkInput(d1, { marker: 'edited-n1' })],
    });

    await publishLabel(b);

    const published = await findArticle(a, 'published');
    expect(published.links.map((l: any) => l.marker)).toEqual(['n1', 'n2']);
    expect(published.links[0].nested?.label ?? null).toBeNull();
    expect(published.links[1].nested.label).toMatchObject({ documentId: b });
  });

  it('restores the link of an xToMany relation at its position', async () => {
    const x = await createLabel('x', true);
    const y = await createLabel('y', true);
    const b = await createLabel('b');
    const a = await createArticle({
      title: 'A',
      labels: [{ documentId: x }, { documentId: b }, { documentId: y }],
    });
    await publishArticle(a);

    expect(ids((await findArticle(a, 'published')).labels)).toEqual([x, y]);

    await publishLabel(b);

    expect(ids((await findArticle(a, 'published')).labels)).toEqual([x, b, y]);
  });

  it('clears the records when the source is published again', async () => {
    const b = await createLabel('b');
    const a = await createArticle({ title: 'A', label: { documentId: b } });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).label).toBeNull();

    await updateArticle(a, { label: null });
    await publishArticle(a);

    await publishLabel(b);

    expect((await findArticle(a, 'published')).label).toBeNull();
    expect((await findArticle(a, 'draft')).label).toBeNull();
  });

  it('restores nothing while the source is unpublished and publishes its draft later', async () => {
    const b = await createLabel('b');
    const c = await createLabel('c', true);
    const a = await createArticle({ title: 'A', labels: [{ documentId: b }] });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).labels).toEqual([]);

    await strapi.documents(ARTICLE_UID).unpublish({ documentId: a });
    await publishLabel(b);
    expect(await findArticle(a, 'published')).toBeNull();

    await updateArticle(a, { labels: [{ documentId: b }, { documentId: c }] });
    await publishArticle(a);

    expect(names((await findArticle(a, 'published')).labels)).toEqual(['b', 'c']);
  });

  it('does not fail and restores nothing when the source was deleted', async () => {
    const b = await createLabel('b');
    const a = await createArticle({ title: 'A', label: { documentId: b } });
    await publishArticle(a);

    await strapi.documents(ARTICLE_UID).delete({ documentId: a });

    await expect(publishLabel(b)).resolves.toBeDefined();

    expect(await findArticle(a, 'published')).toBeNull();
    expect(await findArticle(a, 'draft')).toBeNull();
  });

  it('restores the link of the original publish after the draft is discarded', async () => {
    const b = await createLabel('b');
    const c = await createLabel('c', true);
    const a = await createArticle({ title: 'A', labels: [{ documentId: b }] });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).labels).toEqual([]);

    await updateArticle(a, { labels: [{ documentId: b }, { documentId: c }] });
    await strapi.documents(ARTICLE_UID).discardDraft({ documentId: a });

    await publishLabel(b);

    expect(names((await findArticle(a, 'published')).labels)).toEqual(['b']);
  });

  it('restores the link when the target is unpublished and published again', async () => {
    const b = await createLabel('b', true);
    const a = await createArticle({ title: 'A', label: { documentId: b } });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).label).toMatchObject({ documentId: b });

    await strapi.documents(LABEL_UID).unpublish({ documentId: b });
    expect((await findArticle(a, 'published')).label).toBeNull();

    await publishLabel(b);
    expect((await findArticle(a, 'published')).label).toMatchObject({ documentId: b });
  });

  it('restores the link only when the linked locale of the target is published', async () => {
    const topic = await strapi.documents(TOPIC_UID).create({ data: { name: 'en' }, locale: 'en' });
    await strapi.documents(TOPIC_UID).update({
      documentId: topic.documentId,
      locale: 'fr',
      data: { name: 'fr' },
    });

    const a = await createArticle({
      title: 'A',
      topic: { documentId: topic.documentId, locale: 'en' },
    });
    await publishArticle(a);
    expect((await findArticle(a, 'published')).topic).toBeNull();

    await strapi.documents(TOPIC_UID).publish({ documentId: topic.documentId, locale: 'fr' });
    expect((await findArticle(a, 'published')).topic).toBeNull();

    await strapi.documents(TOPIC_UID).publish({ documentId: topic.documentId, locale: 'en' });
    expect((await findArticle(a, 'published')).topic).toMatchObject({
      documentId: topic.documentId,
      locale: 'en',
    });
  });
});
