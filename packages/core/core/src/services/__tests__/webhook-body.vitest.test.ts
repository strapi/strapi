import { describe, expect, test, vi } from 'vitest';
import type { Modules } from '@strapi/types';

import { createSampleEvent, renderWebhookBody, validateWebhookBody } from '../webhook-body';

type Webhook = Modules.WebhookStore.Webhook;

const payload = {
  event: 'entry.publish',
  createdAt: new Date('2026-10-20T10:00:00.000Z'),
  model: 'article',
  uid: 'api::article.article',
  entry: {
    id: 1,
    documentId: 'abc',
    title: 'Hello',
    views: 12,
    featured: true,
    summary: null,
    tags: [{ name: 'news' }, { name: 'tech' }],
  },
};

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';

const contentTypes = {
  [ARTICLE_UID]: {
    attributes: {
      title: { type: 'string' },
      views: { type: 'integer' },
      secret: { type: 'string', private: true },
      password: { type: 'password' },
      tags: { type: 'relation' },
      cover: { type: 'media' },
      seo: { type: 'component' },
      blocks: { type: 'dynamiczone' },
    },
  },
  [PAGE_UID]: { attributes: { slug: { type: 'uid' }, title: { type: 'string' } } },
} as any;

const createWebhook = (webhook: Partial<Webhook> = {}): Webhook => ({
  id: '1',
  name: 'webhook',
  url: 'https://example.com/hook',
  headers: {},
  events: [],
  contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
  isEnabled: true,
  ...webhook,
});

describe('renderWebhookBody', () => {
  test('Copies a template without placeholders as is', () => {
    const template = { ref: 'main', inputs: { env: 'production' }, retries: 3, dryRun: false };

    expect(renderWebhookBody(template, payload)).toEqual(template);
  });

  test('Replaces a single placeholder with the raw value', () => {
    expect(
      renderWebhookBody(
        {
          event: '{{ event }}',
          entry: '{{ entry }}',
          documentId: '{{ documentId }}',
          views: '{{entry.views}}',
          featured: '{{ entry.featured }}',
          summary: '{{ entry.summary }}',
          createdAt: '{{ createdAt }}',
        },
        payload
      )
    ).toEqual({
      event: 'entry.publish',
      entry: payload.entry,
      documentId: 'abc',
      views: 12,
      featured: true,
      summary: null,
      createdAt: payload.createdAt,
    });
  });

  test('Replaces the placeholders of a longer string with their text', () => {
    expect(
      renderWebhookBody(
        {
          text: '{{ entry.title }} ({{ uid }}) has {{ entry.views }} views, featured: {{ entry.featured }}',
          at: 'at {{ createdAt }}',
          tags: 'tags: {{ entry.tags }}',
        },
        payload
      )
    ).toEqual({
      text: 'Hello (api::article.article) has 12 views, featured: true',
      at: 'at 2026-10-20T10:00:00.000Z',
      tags: 'tags: [{"name":"news"},{"name":"tech"}]',
    });
  });

  test('Renders nested objects and arrays', () => {
    expect(
      renderWebhookBody(
        {
          client_payload: {
            uid: '{{ uid }}',
            entries: ['{{ documentId }}', { title: '{{ entry.title }}' }],
          },
        },
        payload
      )
    ).toEqual({
      client_payload: { uid: 'api::article.article', entries: ['abc', { title: 'Hello' }] },
    });
  });

  test('Gives null for a missing single placeholder and an empty string inside a string', () => {
    expect(
      renderWebhookBody(
        { missing: '{{ entry.unknown }}', text: 'value: {{ entry.unknown }}!' },
        payload
      )
    ).toEqual({ missing: null, text: 'value: !' });
  });

  test('Reports the variables without a value, not the ones holding null', () => {
    const onMissing = vi.fn();

    renderWebhookBody(
      { a: '{{ entry.unknown }}', b: 'x{{ media }}y', c: '{{ entry.summary }}', d: '{{ uid }}' },
      payload,
      onMissing
    );

    expect(onMissing.mock.calls).toEqual([['entry.unknown'], ['media']]);
  });

  test('Only resolves the listed variables, not paths into the payload', () => {
    expect(
      renderWebhookBody(
        {
          nested: '{{ entry.tags.0.name }}',
          other: '{{ media }}',
          proto: '{{ entry.__proto__ }}',
          constructor: '{{ entry.constructor }}',
          date: '{{ createdAt.getTime }}',
        },
        { ...payload, media: { id: 1 } }
      )
    ).toEqual({ nested: null, other: null, proto: null, constructor: null, date: null });
  });

  test('Leaves keys and malformed placeholders untouched', () => {
    expect(
      renderWebhookBody(
        { '{{ event }}': '{{ event', single: '{{ }}', spaced: '{{ entry title }}' },
        payload
      )
    ).toEqual({ '{{ event }}': '{{ event', single: '{{ }}', spaced: '{{ entry title }}' });
  });
});

describe('validateWebhookBody', () => {
  const validate = (body: Webhook['body'], webhook: Partial<Webhook> = {}) =>
    validateWebhookBody(createWebhook({ body, ...webhook }), contentTypes);

  test.each([[null], [undefined], [{}], [{ ref: 'main', retries: 3 }]])(
    'Accepts a template without variables (%j)',
    (body) => {
      expect(() => validate(body)).not.toThrow();
      expect(() =>
        validate(body, { events: ['media.create'], contentTypeEvents: {} })
      ).not.toThrow();
    }
  );

  test.each([[['ref']], ['{"ref":"main"}'], [42]])('Rejects %j, not a JSON object', (body) => {
    expect(() => validate(body as any)).toThrow('Webhook body must be a JSON object');
  });

  test('Accepts every variable, nested in the template', () => {
    expect(() =>
      validate({
        event: '{{ event }}',
        nested: {
          list: ['{{ createdAt }}', '{{ model }} {{ uid }}'],
          id: '{{ documentId }}',
          entry: '{{ entry }}',
          field: 'Title: {{ entry.title }}',
        },
      })
    ).not.toThrow();
  });

  test.each([
    'media',
    'entry.title.length',
    'entry.tags.0.name',
    'entity',
    'a b',
    'entry title',
    '',
  ])('Rejects the unknown variable or path %j', (variable) => {
    expect(() => validate({ text: `value: {{ ${variable} }}` })).toThrow();
  });

  test.each(['{{ entry.title', 'Title: {{ event }} {{ uid', 'event }}', '{{ event }} }}', '{{'])(
    'Rejects %j, a "{{" or "}}" outside of a placeholder',
    (value) => {
      expect(() => validate({ text: value })).toThrow('not part of a {{ variable }} placeholder');
      expect(() => validate({ nested: [{ text: value }] })).toThrow('not part of a {{ variable }}');
    }
  );

  test('Rejects an unterminated placeholder in a key', () => {
    expect(() => validate({ '{{ event': 'x' })).toThrow('not part of a {{ variable }}');
  });

  test('Rejects a variable in a key', () => {
    expect(() => validate({ '{{ event }}': 'x' })).toThrow("keys can't hold a variable");
  });

  test.each(['tags', 'cover', 'seo', 'blocks', 'secret', 'password', 'unknown', 'constructor'])(
    'Rejects the field %s, which is not a scalar field that is always sent',
    (field) => {
      expect(() => validate({ value: `{{ entry.${field} }}` })).toThrow(
        `{{ entry.${field} }} is not a scalar field of ${ARTICLE_UID}`
      );
    }
  );

  test('Checks a field against every content type the webhook targets', () => {
    const contentTypeEvents = { [ARTICLE_UID]: ['entry.create'], [PAGE_UID]: ['entry.create'] };

    expect(() => validate({ value: '{{ entry.title }}' }, { contentTypeEvents })).not.toThrow();
    expect(() => validate({ value: '{{ entry.views }}' }, { contentTypeEvents })).toThrow(
      `{{ entry.views }} is not a scalar field of ${PAGE_UID}`
    );
  });

  test('Ignores a targeted content type that was deleted', () => {
    expect(() =>
      validate(
        { value: '{{ entry.title }}' },
        { contentTypeEvents: { 'api::deleted.deleted': ['entry.create'] } }
      )
    ).not.toThrow();
  });

  test('Only accepts the common fields when the events are selected for every content type', () => {
    const webhook = { events: ['entry.create'], contentTypeEvents: {} };

    expect(() =>
      validate(
        {
          id: '{{ entry.id }}',
          documentId: '{{ entry.documentId }}',
          createdAt: '{{ entry.createdAt }}',
          updatedAt: '{{ entry.updatedAt }}',
        },
        webhook
      )
    ).not.toThrow();
    expect(() => validate({ value: '{{ entry.title }}' }, webhook)).toThrow(
      'can only be used when the events are selected per content type'
    );
  });

  test.each(['entry', 'uid', 'model', 'documentId', 'entry.id'])(
    'Rejects {{ %s }} on a webhook that listens to another kind of event',
    (variable) => {
      expect(() =>
        validate(
          { value: `{{ ${variable} }}` },
          { events: ['entry.create', 'media.create'], contentTypeEvents: {} }
        )
      ).toThrow(`not available for the event media.create`);
    }
  );

  test('Accepts the event variables on every event', () => {
    expect(() =>
      validate(
        { event: '{{ event }}', at: '{{ createdAt }}' },
        { events: ['media.create'], contentTypeEvents: {} }
      )
    ).not.toThrow();
  });
});

describe('createSampleEvent', () => {
  test('Gives a value to every variable a valid template can use', () => {
    const webhook = createWebhook();
    const template = {
      model: '{{ model }}',
      uid: '{{ uid }}',
      documentId: '{{ documentId }}',
      title: '{{ entry.title }}',
      views: '{{ entry.views }}',
      updatedAt: '{{ entry.updatedAt }}',
    };

    validateWebhookBody({ ...webhook, body: template }, contentTypes);

    const onMissing = vi.fn();
    const rendered = renderWebhookBody(
      template,
      { event: 'trigger-test', ...createSampleEvent(webhook, contentTypes) },
      onMissing
    );

    expect(onMissing).not.toHaveBeenCalled();
    expect(rendered).toEqual({
      model: 'article',
      uid: ARTICLE_UID,
      documentId: 'sample-document-id',
      title: 'Sample title',
      views: 1,
      updatedAt: expect.any(String),
    });
  });

  test('Leaves out what an event would not send', () => {
    const { entry } = createSampleEvent(createWebhook(), contentTypes) as {
      entry: Record<string, unknown>;
    };

    ['secret', 'password', 'tags', 'cover', 'seo', 'blocks'].forEach((field) => {
      expect(entry).not.toHaveProperty(field);
    });
  });

  test('Only has the common fields when no content type is targeted', () => {
    const sample = createSampleEvent(
      createWebhook({ events: ['entry.create'], contentTypeEvents: {} }),
      contentTypes
    );

    expect(sample).toEqual({
      model: 'sample',
      uid: 'api::sample.sample',
      entry: {
        id: 1,
        documentId: 'sample-document-id',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
  });
});
