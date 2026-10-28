import { renderWebhookBody } from '../webhook-body';

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
    author: { name: 'Jane' },
  },
};

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
          tags: '{{ entry.tags }}',
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
      tags: payload.entry.tags,
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
          author: 'by {{ entry.author }} at {{ createdAt }}',
          tags: 'tags: {{ entry.tags }}',
        },
        payload
      )
    ).toEqual({
      text: 'Hello (api::article.article) has 12 views, featured: true',
      author: 'by {"name":"Jane"} at 2026-10-20T10:00:00.000Z',
      tags: 'tags: [{"name":"news"},{"name":"tech"}]',
    });
  });

  test('Renders nested objects and arrays', () => {
    expect(
      renderWebhookBody(
        {
          client_payload: {
            uid: '{{ uid }}',
            entries: ['{{ entry.documentId }}', { title: '{{ entry.title }}' }],
          },
        },
        payload
      )
    ).toEqual({
      client_payload: { uid: 'api::article.article', entries: ['abc', { title: 'Hello' }] },
    });
  });

  test('Reaches array items by index', () => {
    expect(
      renderWebhookBody({ first: '{{ entry.tags.0.name }}', all: '{{ entry.tags.1 }}' }, payload)
    ).toEqual({ first: 'news', all: { name: 'tech' } });
  });

  test('Gives null for a missing single placeholder and an empty string inside a string', () => {
    expect(
      renderWebhookBody(
        {
          missing: '{{ entry.unknown }}',
          deep: '{{ entry.summary.length }}',
          text: 'value: {{ entry.unknown }}!',
        },
        payload
      )
    ).toEqual({ missing: null, deep: null, text: 'value: !' });
  });

  test('Does not reach prototype members or the methods of a date', () => {
    expect(
      renderWebhookBody(
        {
          proto: '{{ entry.__proto__ }}',
          constructor: '{{ entry.constructor }}',
          toString: '{{ entry.title.toString }}',
          date: '{{ createdAt.getTime }}',
        },
        payload
      )
    ).toEqual({ proto: null, constructor: null, toString: null, date: null });
  });

  test('Leaves keys and malformed placeholders untouched', () => {
    expect(
      renderWebhookBody(
        { '{{ event }}': '{{ event', single: '{{ }}', spaced: '{{ entry title }}' },
        payload
      )
    ).toEqual({ '{{ event }}': '{{ event', single: '{{ }}', spaced: '{{ entry title }}' });
  });

  test('Renders the placeholders against an empty payload', () => {
    expect(renderWebhookBody({ event: '{{ event }}', text: 'x{{ entry }}y' }, {})).toEqual({
      event: null,
      text: 'xy',
    });
  });
});
