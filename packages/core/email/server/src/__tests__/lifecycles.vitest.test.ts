import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { subscribeTemplateLifecycles } from '../lifecycles';

type Row = { id: number; key: string; locale: string | null };

const setup = (rows: Row[]) => {
  const findOne = vi.fn(
    async ({ where }: { where: Record<string, unknown> }) =>
      rows.find((row) =>
        Object.entries(where).every(
          ([field, value]) => (row as Record<string, unknown>)[field] === value
        )
      ) ?? null
  );
  const subscribe = vi.fn();
  const strapi = {
    db: { query: vi.fn(() => ({ findOne })), lifecycles: { subscribe } },
  } as unknown as Core.Strapi;

  subscribeTemplateLifecycles(strapi);

  return subscribe.mock.calls[0][0] as {
    models: string[];
    beforeCreate: (event: unknown) => Promise<void>;
    beforeUpdate: (event: unknown) => Promise<void>;
  };
};

describe('Template lifecycles', () => {
  const rows: Row[] = [
    { id: 1, key: 'a.b', locale: 'en' },
    { id: 2, key: 'a.b', locale: 'fr' },
  ];

  it('subscribes to the template model only', () => {
    expect(setup(rows).models).toEqual(['plugin::email.template']);
  });

  it('refuses to create a second template with the same key and locale', async () => {
    const { beforeCreate } = setup(rows);

    await expect(beforeCreate({ params: { data: { key: 'a.b', locale: 'en' } } })).rejects.toThrow(
      errors.ValidationError
    );
    await expect(beforeCreate({ params: { data: { key: 'a.b', locale: 'en' } } })).rejects.toThrow(
      'already exists'
    );
    await expect(
      beforeCreate({ params: { data: { key: 'a.b', locale: 'de' } } })
    ).resolves.toBeUndefined();
  });

  it('refuses an update that moves a template onto a key and locale in use', async () => {
    const { beforeUpdate } = setup(rows);

    await expect(
      beforeUpdate({ params: { where: { id: 2 }, data: { locale: 'en' } } })
    ).rejects.toThrow(errors.ValidationError);
  });

  it('lets a template be updated in place', async () => {
    const { beforeUpdate } = setup(rows);

    await expect(
      beforeUpdate({ params: { where: { id: 1 }, data: { subject: 'New' } } })
    ).resolves.toBeUndefined();
    await expect(
      beforeUpdate({ params: { where: { id: 1 }, data: { key: 'a.b', locale: 'en' } } })
    ).resolves.toBeUndefined();
  });
});
