import { beforeEach, describe, expect, it } from 'vitest';

import { createProvenanceService, type Target } from '../provenance';

import type { RequestSnapshot } from '../../domain/declaration';

type Row = Record<string, any>;

/**
 * In-memory stand-in for `strapi.db.query`, supporting the subset the service uses:
 * equality, `null` and `$in` conditions.
 */
const createFakeQuery = () => {
  let rows: Row[] = [];
  let nextId = 1;

  const matches = (row: Row, where: Row = {}) => {
    return Object.entries(where).every(([key, condition]) => {
      if (condition !== null && typeof condition === 'object' && '$in' in condition) {
        return condition.$in.includes(row[key]);
      }

      return (row[key] ?? null) === condition;
    });
  };

  return {
    get rows() {
      return rows;
    },
    async findMany({ where }: { where?: Row } = {}) {
      return rows.filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
    async deleteMany({ where }: { where?: Row } = {}) {
      const before = rows.length;
      rows = rows.filter((row) => !matches(row, where));
      return { count: before - rows.length };
    },
    async createMany({ data }: { data: Row[] }) {
      for (const row of data) {
        rows.push({ ...row, id: nextId });
        nextId += 1;
      }
      return { count: data.length };
    },
  };
};

const ARTICLE = {
  attributes: {
    title: { type: 'string' },
    body: { type: 'richtext' },
    price: { type: 'integer' },
  },
};

const target: Target = {
  uid: 'api::article.article',
  documentId: 'doc1',
  locale: 'en',
  status: 'draft',
};

const admin: RequestSnapshot = { strategy: 'admin', userId: 1, headerClaim: null, bodyClaims: {} };
const agentToken: RequestSnapshot = {
  strategy: 'content-api-token',
  tokenId: 7,
  tokenProfile: 'agent',
  headerClaim: { source: 'ai', model: 'claude-opus-5-5' },
  bodyClaims: {},
};
const fields = ['title', 'body', 'price'];

describe('provenance service', () => {
  let query: ReturnType<typeof createFakeQuery>;
  let service: ReturnType<typeof createProvenanceService>;

  beforeEach(() => {
    query = createFakeQuery();
    service = createProvenanceService({
      strapi: {
        db: { query: () => query },
        contentType: () => ARTICLE,
      } as any,
    });
  });

  const view = (values: Record<string, unknown>) => service.getForEntry(target, values);

  it('records non-empty fields of a created entry', async () => {
    await service.recordWrite({
      target,
      fields,
      before: null,
      after: { title: 'Hello', body: 'Generated', price: null },
      snapshot: agentToken,
    });

    const result = await view({ title: 'Hello', body: 'Generated', price: null });

    expect(result.title).toMatchObject({
      source: 'ai-generated',
      signal: 'token',
      model: 'claude-opus-5-5',
      actor: { type: 'api-token', id: '7' },
      review: null,
    });
    expect(result.body.source).toBe('ai-generated');
    expect(result.price).toMatchObject({ source: 'unattributed', recordedAt: null });
  });

  it('leaves unchanged fields alone when a whole form is saved again', async () => {
    await service.recordWrite({
      target,
      fields,
      before: null,
      after: { title: 'Hello', body: 'Generated', price: 3 },
      snapshot: agentToken,
    });

    await service.recordWrite({
      target,
      fields,
      before: { title: 'Hello', body: 'Generated', price: 3 },
      after: { title: 'Hello world', body: 'Generated', price: 3 },
      snapshot: admin,
    });

    const result = await view({ title: 'Hello world', body: 'Generated', price: 3 });

    // A human edit of AI output
    expect(result.title).toMatchObject({ source: 'ai-assisted', signal: 'admin-session' });
    expect(result.body).toMatchObject({ source: 'ai-generated', signal: 'token' });
    expect(result.price.source).toBe('ai-generated');
  });

  it('does not inherit AI provenance when the overwritten value had drifted', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'Generated' },
      snapshot: agentToken,
    });

    // Someone changed the value with a raw query, then an admin edits it
    await service.recordWrite({
      target,
      fields: ['title'],
      before: { title: 'Changed outside' },
      after: { title: 'Typed by hand' },
      snapshot: admin,
    });

    expect((await view({ title: 'Typed by hand' })).title.source).toBe('human-entered');
  });

  it('reports drift when the current value no longer matches', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'Generated' },
      snapshot: agentToken,
    });

    expect((await view({ title: 'Changed outside' })).title).toMatchObject({
      source: 'unattributed',
      drifted: true,
    });
  });

  it('records writes without any signal as unattributed', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'From a script' },
      snapshot: null,
    });

    expect((await view({ title: 'From a script' })).title).toMatchObject({
      source: 'unattributed',
      signal: 'none',
      actor: { type: 'system', id: null },
    });
  });

  it('counts AI fields and the ones left to review, per entry', async () => {
    await service.recordWrite({
      target,
      fields: ['title', 'body', 'price'],
      before: null,
      after: { title: 'Generated', body: 'Generated', price: 5 },
      snapshot: agentToken,
    });
    await service.recordWrite({
      target: { ...target, documentId: 'doc2' },
      fields: ['title'],
      before: null,
      after: { title: 'By hand' },
      snapshot: admin,
    });
    await service.markReviewed({
      target,
      fields: ['title'],
      current: { title: 'Generated' },
      userId: 1,
    });

    expect(await service.summarize({ uid: target.uid, status: 'draft', locale: 'en' })).toEqual({
      doc1: { ai: 3, toReview: 2 },
    });
  });

  it('reads several entries at once, limited to the fields they expose', async () => {
    await service.recordWrite({
      target,
      fields: ['title', 'body'],
      before: null,
      after: { title: 'Generated', body: 'Generated' },
      snapshot: agentToken,
    });

    const [first, second] = await service.getForEntries({
      uid: target.uid,
      status: 'draft',
      entries: [
        { documentId: 'doc1', locale: 'en', values: { title: 'Generated' } },
        { documentId: 'doc2', locale: 'en', values: { title: 'Other' } },
      ],
    });

    expect(Object.keys(first)).toEqual(['title']);
    expect(first.title.source).toBe('ai-generated');
    expect(second.title.source).toBe('unattributed');
  });

  it('keeps AI content unreviewed when its value no longer matches the record', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'Generated' },
      snapshot: agentToken,
    });

    // Changed outside the Document Service: the view says unattributed, the guard still blocks
    expect((await view({ title: 'Edited in SQL' })).title.source).toBe('unattributed');
    expect(await service.findUnreviewedAi(target, { title: 'Edited in SQL' })).toEqual(['title']);

    await service.markReviewed({
      target,
      fields: ['title'],
      current: { title: 'Edited in SQL' },
      userId: 1,
    });

    expect(await service.findUnreviewedAi(target, { title: 'Edited in SQL' })).toEqual([]);
  });

  it('does not review empty fields nobody wrote', async () => {
    await service.markReviewed({
      target,
      fields: ['title', 'slug'],
      current: { title: 'Written', slug: null },
      userId: 1,
    });

    expect(query.rows.map((row) => row.fieldPath)).toEqual(['title']);
  });

  it('ties a review to the reviewed value', async () => {
    await service.recordWrite({
      target,
      fields: ['title', 'body'],
      before: null,
      after: { title: 'Generated', body: 'Generated' },
      snapshot: agentToken,
    });

    await service.markReviewed({
      target,
      fields: ['title', 'body', 'price'],
      current: { title: 'Generated', body: 'Generated', price: 5 },
      userId: 1,
    });

    let result = await view({ title: 'Generated', body: 'Generated', price: 5 });

    expect(result.title).toMatchObject({ source: 'ai-generated', review: { byId: '1' } });
    // Reviewing a field without provenance does not say who wrote it
    expect(result.price).toMatchObject({ source: 'unattributed', review: { byId: '1' } });

    // An agent rewrites the title after the review
    await service.recordWrite({
      target,
      fields: ['title'],
      before: { title: 'Generated' },
      after: { title: 'Rewritten' },
      snapshot: agentToken,
    });

    result = await view({ title: 'Rewritten', body: 'Generated', price: 5 });

    expect(result.title.review).toBeNull();
    expect(result.body.review).toMatchObject({ byId: '1' });

    // A raw write changes the body: the review no longer holds
    result = await view({ title: 'Rewritten', body: 'Changed outside', price: 5 });

    expect(result.body).toMatchObject({ review: null, reviewOutdated: true });
  });

  it('lets an admin declare AI after the fact, which needs a new review', async () => {
    await service.recordWrite({
      target,
      fields: ['body'],
      before: null,
      after: { body: 'Pasted' },
      snapshot: admin,
    });
    await service.markReviewed({
      target,
      fields: ['body'],
      current: { body: 'Pasted' },
      userId: 2,
    });

    await service.declareAi({
      target,
      fields: ['body'],
      current: { body: 'Pasted' },
      userId: 1,
      edited: false,
      model: 'chat assistant',
    });

    expect((await view({ body: 'Pasted' })).body).toMatchObject({
      source: 'ai-generated',
      signal: 'admin-session',
      model: 'chat assistant',
      // Reviewed as human-written: not a review of AI output
      review: null,
    });

    // Once reviewed as AI, declaring again (to add the model) keeps the review
    await service.markReviewed({
      target,
      fields: ['body'],
      current: { body: 'Pasted' },
      userId: 2,
    });
    await service.declareAi({
      target,
      fields: ['body'],
      current: { body: 'Pasted' },
      userId: 1,
      edited: false,
      model: 'another model',
    });

    expect((await view({ body: 'Pasted' })).body.review).toMatchObject({ byId: '2' });
  });

  it('mirrors draft provenance on publish and removes it on delete', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'Generated' },
      snapshot: agentToken,
    });

    await service.copyStatus({
      uid: target.uid,
      documentId: target.documentId,
      locales: ['en'],
      from: 'draft',
      to: 'published',
    });

    const published = await service.getForEntry(
      { ...target, status: 'published' },
      { title: 'Generated' }
    );

    expect(published.title.source).toBe('ai-generated');
    expect(query.rows).toHaveLength(2);

    // Publishing again replaces the published rows instead of piling them up
    await service.copyStatus({
      uid: target.uid,
      documentId: target.documentId,
      locales: ['en'],
      from: 'draft',
      to: 'published',
    });

    expect(query.rows).toHaveLength(2);

    await service.deleteFor({
      uid: target.uid,
      documentId: target.documentId,
      locales: ['en'],
      statuses: ['published'],
    });

    expect(query.rows.map((row) => row.targetStatus)).toEqual(['draft']);

    await service.deleteFor({ uid: target.uid, documentId: target.documentId, locales: ['en'] });

    expect(query.rows).toHaveLength(0);
  });

  it('keeps locales apart', async () => {
    await service.recordWrite({
      target,
      fields: ['title'],
      before: null,
      after: { title: 'Generated' },
      snapshot: agentToken,
    });

    const french = await service.getForEntry({ ...target, locale: 'fr' }, { title: 'Generated' });

    expect(french.title.source).toBe('unattributed');
  });
});
