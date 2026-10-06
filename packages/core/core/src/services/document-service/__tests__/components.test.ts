import { findComponentParent, getParentSchemasForComponent } from '../components';

type Row = Record<string, unknown>;

const LINK_UID = 'default.link';
const CARD_UID = 'default.card';
const DP_HOST_UID = 'api::dp-host.dp-host';
const PLAIN_HOST_UID = 'api::plain-host.plain-host';

const contentTypes = {
  [DP_HOST_UID]: {
    uid: DP_HOST_UID,
    modelType: 'contentType',
    collectionName: 'dp_hosts',
    options: { draftAndPublish: true },
    attributes: { blocks: { type: 'dynamiczone', components: [LINK_UID, CARD_UID] } },
  },
  [PLAIN_HOST_UID]: {
    uid: PLAIN_HOST_UID,
    modelType: 'contentType',
    collectionName: 'plain_hosts',
    options: { draftAndPublish: false },
    attributes: { blocks: { type: 'dynamiczone', components: [LINK_UID, CARD_UID] } },
  },
};

const components = {
  [LINK_UID]: {
    uid: LINK_UID,
    modelType: 'component',
    modelName: 'link',
    collectionName: 'components_default_links',
    attributes: { target: { type: 'relation', relation: 'oneToOne', target: DP_HOST_UID } },
  },
  [CARD_UID]: {
    uid: CARD_UID,
    modelType: 'component',
    modelName: 'card',
    collectionName: 'components_default_cards',
    attributes: { link: { type: 'component', component: LINK_UID } },
  },
};

const identifiers = {
  getNameFromTokens: (tokens: { name: string; shortName?: string }[]) =>
    tokens.map(({ name, shortName }) => shortName ?? name).join('_'),
  getJoinColumnAttributeIdName: (name: string) => `${name}_id`,
};

/**
 * A `_cmps` row linking a component instance to the entry (or parent component) that owns it.
 */
const owns = (entityId: number, componentUid: string, componentId: number): Row => ({
  entity_id: entityId,
  cmp_id: componentId,
  component_type: componentUid,
});

/**
 * Minimal in-memory stand-in for the knex query builder, over a fixed set of `_cmps` tables.
 * Records every table queried, and fails queries on the tables listed in `failingTables`.
 */
const createConnection = (tables: Record<string, Row[]>, failingTables: string[] = []) => {
  const queriedTables: string[] = [];

  const getConnection = jest.fn((table: string) => {
    queriedTables.push(table);
    let rows = tables[table] ?? [];

    const result = () =>
      failingTables.includes(table)
        ? Promise.reject(new Error(`no such table: ${table}`))
        : Promise.resolve(rows);

    const qb: any = {
      select: () => qb,
      transacting: () => qb,
      where(column: string | Row, value?: unknown) {
        const conditions = typeof column === 'string' ? { [column]: value } : column;
        rows = rows.filter((row) => Object.entries(conditions).every(([k, v]) => row[k] === v));
        return qb;
      },
      whereIn(column: string, values: unknown[]) {
        rows = rows.filter((row) => values.includes(row[column]));
        return qb;
      },
      first: () => result().then((found) => found[0]),
      then: (resolve: any, reject: any) => result().then(resolve, reject),
    };

    return qb;
  });

  return { getConnection, queriedTables };
};

const setupStrapi = ({
  tables = {},
  failingTables = [],
  registeredTables = ['dp_hosts_cmps', 'plain_hosts_cmps', 'components_default_cards_cmps'],
}: {
  tables?: Record<string, Row[]>;
  failingTables?: string[];
  registeredTables?: string[];
} = {}) => {
  const { getConnection, queriedTables } = createConnection(tables, failingTables);
  const getSchemaConnection = jest.fn();

  global.strapi = {
    contentTypes,
    components,
    db: {
      metadata: {
        identifiers,
        has: (uid: string) => registeredTables.includes(uid),
      },
      getConnection,
      getSchemaConnection,
    },
  } as any;

  return { queriedTables, getSchemaConnection };
};

const linkSchema = components[LINK_UID] as any;

describe('findComponentParent', () => {
  it('returns the first candidate parent whose join table links the instance', async () => {
    setupStrapi({
      tables: {
        dp_hosts_cmps: [owns(10, LINK_UID, 1)],
        plain_hosts_cmps: [owns(20, LINK_UID, 1)],
      },
    });

    const parent = await findComponentParent(
      linkSchema,
      1,
      getParentSchemasForComponent(linkSchema)
    );

    expect(parent).toEqual({ uid: DP_HOST_UID, table: 'dp_hosts', parentId: 10 });
  });

  it('only matches rows of the same component type', async () => {
    setupStrapi({
      tables: {
        dp_hosts_cmps: [owns(10, CARD_UID, 1)],
        plain_hosts_cmps: [owns(20, LINK_UID, 1)],
      },
    });

    const parent = await findComponentParent(
      linkSchema,
      1,
      getParentSchemasForComponent(linkSchema)
    );

    expect(parent).toEqual({ uid: PLAIN_HOST_UID, table: 'plain_hosts', parentId: 20 });
  });

  it('returns null when no parent links the instance', async () => {
    setupStrapi({ tables: { dp_hosts_cmps: [owns(10, LINK_UID, 2)] } });

    const parent = await findComponentParent(
      linkSchema,
      1,
      getParentSchemasForComponent(linkSchema)
    );

    expect(parent).toBeNull();
  });

  it('skips parents whose join table is not registered, without querying it or the schema', async () => {
    const { queriedTables, getSchemaConnection } = setupStrapi({
      tables: { plain_hosts_cmps: [owns(20, LINK_UID, 1)] },
      registeredTables: ['plain_hosts_cmps', 'components_default_cards_cmps'],
    });

    const parent = await findComponentParent(
      linkSchema,
      1,
      getParentSchemasForComponent(linkSchema)
    );

    expect(parent).toEqual({ uid: PLAIN_HOST_UID, table: 'plain_hosts', parentId: 20 });
    expect(queriedTables).not.toContain('dp_hosts_cmps');
    expect(getSchemaConnection).not.toHaveBeenCalled();
  });

  it('skips a parent whose lookup fails and keeps looking', async () => {
    setupStrapi({
      tables: {
        dp_hosts_cmps: [owns(10, LINK_UID, 1)],
        plain_hosts_cmps: [owns(20, LINK_UID, 1)],
      },
      failingTables: ['dp_hosts_cmps'],
    });

    const parent = await findComponentParent(
      linkSchema,
      1,
      getParentSchemasForComponent(linkSchema)
    );

    expect(parent).toEqual({ uid: PLAIN_HOST_UID, table: 'plain_hosts', parentId: 20 });
  });
});
