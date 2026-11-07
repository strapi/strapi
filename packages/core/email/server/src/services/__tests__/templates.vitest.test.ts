import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import createTemplatesService from '../templates';

type Row = { id: number; key: string; locale: string; subject: string; html: string; text: string };

const defaultsDef = {
  defaults: { subject: 'Reset for {{ user.name }}', html: '<p>{{ url }}</p>', text: '{{ url }}' },
  variables: ['user.name', 'url'],
  description: 'Reset password',
};

const createStrapi = (isLoaded = false) => {
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
    db: { query: vi.fn(() => db) },
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
  } as unknown as Core.Strapi;

  return { strapi, db, send, getRows: () => rows };
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
});
