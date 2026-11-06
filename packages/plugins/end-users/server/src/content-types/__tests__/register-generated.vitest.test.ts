import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { AuthEngine, EngineTable } from '../../engine/types';
import { registerGeneratedContentTypes } from '../register-generated';

const tables: EngineTable[] = [
  {
    name: 'user',
    fields: {
      email: { type: 'string', unique: true },
      name: { type: 'string' },
    },
  },
  {
    name: 'twoFactor',
    fields: {
      secret: { type: 'string' },
      userId: { type: 'string', references: { model: 'user', field: 'id' } },
    },
  },
  { name: 'jwks', fields: { privateKey: { type: 'string' } } },
  { name: 'unused', fields: { a: { type: 'string' } }, disableMigrations: true },
];

const setup = ({ i18n = false }: { i18n?: boolean } = {}) => {
  const add = vi.fn();
  const strapi = {
    get: vi.fn((name: string) => (name === 'content-types' ? { add } : undefined)),
    plugin: vi.fn((name: string) => (name === 'i18n' && i18n ? {} : undefined)),
    db: {
      metadata: {
        identifiers: {
          getIndexName: (names: string | string[]) => `idx_${[names].flat().join('_')}`,
          getUniqueIndexName: (names: string | string[]) => `uniq_${[names].flat().join('_')}`,
          getTableName: (name: string) => name,
        },
        naming: { columnName: (name: string) => name },
      },
    },
  } as unknown as Core.Strapi;
  const engine = { schema: () => tables } as unknown as AuthEngine;

  const names = registerGeneratedContentTypes(strapi, engine);

  const [namespace, registered] = add.mock.calls[0] as [
    string,
    Record<string, { schema: Record<string, any> }>,
  ];

  return { add, namespace, registered, names };
};

describe('registerGeneratedContentTypes', () => {
  it('registers every table of the engine under the namespace of the plugin, in one call', () => {
    const { add, namespace, registered } = setup();

    expect(add).toHaveBeenCalledTimes(1);
    expect(namespace).toBe('plugin::end-users');
    expect(Object.keys(registered).sort()).toEqual(['jwk', 'two-factor', 'user']);
  });

  it('returns the singular names it registered, the ones the engine configuration produced', () => {
    const { names, registered } = setup();

    expect(names).toEqual(Object.keys(registered));
    expect([...names].sort()).toEqual(['jwk', 'two-factor', 'user']);
  });

  it('gives each type the locale attributes i18n gives every type in its register, which ran before', () => {
    const { registered } = setup({ i18n: true });

    for (const { schema } of Object.values(registered)) {
      // Not localized: private, as i18n makes them on a type that isn't
      expect(schema.attributes.locale).toEqual({
        writable: true,
        private: true,
        configurable: false,
        visible: false,
        type: 'string',
      });
      expect(schema.attributes.localizations).toMatchObject({
        type: 'relation',
        relation: 'oneToMany',
        private: true,
        unstable_virtual: true,
        joinColumn: { name: 'document_id', referencedColumn: 'document_id' },
      });
    }

    expect(registered.user.schema.attributes.localizations.target).toBe('plugin::end-users.user');
    expect(
      registered.user.schema.attributes.localizations.joinColumn.on({ results: [{ id: 1 }] })
    ).toEqual({ id: { $notIn: [1] } });
  });

  it('adds no locale attribute without i18n', () => {
    const { registered } = setup();

    expect(registered.user.schema.attributes).not.toHaveProperty('locale');
    expect(registered.user.schema.attributes).not.toHaveProperty('localizations');
  });

  it('leaves out a table the engine does not want created', () => {
    expect(Object.keys(setup().registered)).not.toContain('unused');
  });

  it('gives each type what the plugin loader gives a type from a schema.json', () => {
    const { registered } = setup();

    expect(registered.user.schema).toMatchObject({ plugin: 'end-users', globalId: 'EndUsersUser' });
    expect(registered['two-factor'].schema).toMatchObject({
      plugin: 'end-users',
      globalId: 'EndUsersTwoFactor',
    });
    expect(registered.jwk.schema).toMatchObject({ plugin: 'end-users', globalId: 'EndUsersJwk' });
  });

  it('keeps the table names the generator chose', () => {
    const { registered } = setup();

    expect(registered.user.schema.collectionName).toBe('eu_users');
    expect(registered['two-factor'].schema.collectionName).toBe('eu_two_factors');
    expect(registered.jwk.schema.collectionName).toBe('eu_jwks');
  });
});
