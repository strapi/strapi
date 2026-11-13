import { describe, expect, it } from 'vitest';

import contentTypes from '..';

type Index = { name: string; columns: string[]; type?: string };

const { role, permission } = contentTypes;

describe('the role content type', () => {
  const { attributes, indexes } = role.schema as unknown as {
    attributes: Record<string, Record<string, unknown>>;
    indexes: Index[];
  };

  it('is `EndUserRole` on GraphQL, with no plugin prefix, and the permission type is not named', () => {
    const options = (schema: unknown) =>
      (schema as { pluginOptions: Record<string, unknown> }).pluginOptions;

    expect(options(role.schema).graphql).toEqual({
      typeName: { singular: 'EndUserRole', plural: 'EndUserRoles' },
    });
    expect(options(permission.schema)).not.toHaveProperty('graphql');
  });

  it('has a real unique index on name, which `unique: true` alone does not create', () => {
    // Strapi's database layer reads an index from `indexes` (or `column.unique`), never from the
    // top-level `unique` flag, which only makes the entity validator select before it inserts
    expect(indexes).toContainEqual({ name: 'eu_roles_name_uq', columns: ['name'], type: 'unique' });
    // The flag stays: it is what answers a second role of the same name with a validation error
    expect(attributes.name.unique).toBe(true);
  });

  it('has no unique index on type: there are as many custom roles as anyone makes', () => {
    expect(attributes.type.unique).toBeUndefined();
    expect(indexes.filter((index) => index.columns.includes('type'))).toEqual([]);
  });

  it('has a revision, an integer that starts at 0, which every save of a role moves on', () => {
    expect(attributes.revision).toEqual({ type: 'integer', default: 0, configurable: false });
    // Not required: a role from before the column has none, and `service('role')` reads that as 0
    expect(attributes.revision.required).toBeUndefined();
  });

  it('has no other unique index', () => {
    expect(
      indexes.filter((index) => index.type === 'unique').map((index) => index.columns)
    ).toEqual([['name']]);
  });
});

describe('the role and permission content types', () => {
  it.each([
    ['role', role],
    ['permission', permission],
  ])(
    'keep the %s out of the Content Manager and the Content-Type Builder',
    (_name, contentType) => {
      const { pluginOptions } = contentType.schema as unknown as {
        pluginOptions: Record<string, unknown>;
      };

      expect(pluginOptions['content-manager']).toEqual({ visible: false });
      expect(pluginOptions['content-type-builder']).toEqual({ visible: false });
    }
  );
});

describe('the permission content type', () => {
  it('keeps the role as a join column, which createMany can write and a link table it cannot', () => {
    const { attributes } = permission.schema as unknown as {
      attributes: Record<string, Record<string, unknown>>;
    };

    expect(attributes.role).toMatchObject({
      type: 'relation',
      relation: 'manyToOne',
      useJoinTable: false,
    });
  });
});
