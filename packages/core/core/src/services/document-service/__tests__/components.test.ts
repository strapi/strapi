import {
  createComponentRelationFilter,
  findComponentParent,
  getParentSchemasForComponent,
} from '../components';

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

describe('createComponentRelationFilter', () => {
  const filterRelationsToPropagate = createComponentRelationFilter();

  /**
   * Rows of the link component's relation join table, one per link instance id
   */
  const linkRelations = (ids: number[]) =>
    ids.map((id) => ({ id: 1000 + id, link_id: id, dp_host_id: 99 }));

  it('drops relations of instances owned by a draft and publish entry, directly or through a parent component', async () => {
    setupStrapi({
      tables: {
        dp_hosts_cmps: [owns(10, LINK_UID, 1), owns(11, CARD_UID, 100)],
        plain_hosts_cmps: [owns(20, LINK_UID, 2), owns(21, CARD_UID, 200)],
        components_default_cards_cmps: [
          owns(100, LINK_UID, 3),
          owns(200, LINK_UID, 4),
          owns(300, LINK_UID, 6),
        ],
      },
    });

    // 1: in a draft and publish entry                    -> dropped
    // 2: in an entry without draft and publish           -> kept
    // 3: in a card, in a draft and publish entry         -> dropped
    // 4: in a card, in an entry without draft and publish -> kept
    // 5: in nothing                                      -> kept
    // 6: in a card that is in nothing                    -> kept
    const kept = await filterRelationsToPropagate(
      linkRelations([1, 2, 3, 4, 5, 6]),
      linkSchema,
      {}
    );

    expect(kept.map((relation) => relation.link_id)).toEqual([2, 4, 5, 6]);
  });

  it('queries each candidate parent once per nesting level, however many relations there are', async () => {
    const linkIds = Array.from({ length: 50 }, (_, i) => i + 1);
    const { queriedTables, getSchemaConnection } = setupStrapi({
      tables: {
        plain_hosts_cmps: [owns(20, CARD_UID, 100)],
        components_default_cards_cmps: linkIds.map((id) => owns(100, LINK_UID, id)),
      },
    });

    const kept = await filterRelationsToPropagate(linkRelations(linkIds), linkSchema, {});

    expect(kept).toHaveLength(50);
    expect(queriedTables).toEqual([
      // parents of the links
      'dp_hosts_cmps',
      'plain_hosts_cmps',
      'components_default_cards_cmps',
      // parents of the card holding them
      'dp_hosts_cmps',
      'plain_hosts_cmps',
    ]);
    expect(getSchemaConnection).not.toHaveBeenCalled();
  });

  it('stops checking candidate parents once every instance has been found', async () => {
    const { queriedTables } = setupStrapi({
      tables: { dp_hosts_cmps: [owns(10, LINK_UID, 1), owns(10, LINK_UID, 2)] },
    });

    const kept = await filterRelationsToPropagate(linkRelations([1, 2]), linkSchema, {});

    expect(kept).toEqual([]);
    expect(queriedTables).toEqual(['dp_hosts_cmps']);
  });

  it('looks instances up in batches', async () => {
    const linkIds = Array.from({ length: 501 }, (_, i) => i + 1);
    const { queriedTables } = setupStrapi({
      tables: { dp_hosts_cmps: linkIds.map((id) => owns(10, LINK_UID, id)) },
    });

    const kept = await filterRelationsToPropagate(linkRelations(linkIds), linkSchema, {});

    expect(kept).toEqual([]);
    expect(queriedTables).toEqual(['dp_hosts_cmps', 'dp_hosts_cmps']);
  });

  it('returns relations of content types unchanged without querying', async () => {
    const { queriedTables } = setupStrapi();
    const relations = linkRelations([1]);

    const kept = await filterRelationsToPropagate(relations, contentTypes[DP_HOST_UID] as any, {});

    expect(kept).toBe(relations);
    expect(queriedTables).toEqual([]);
  });

  it('keeps querying later parents for ids past the first batch', async () => {
    const linkIds = Array.from({ length: 501 }, (_, i) => i + 1);
    const plain = contentTypes[PLAIN_HOST_UID] as any;
    const previous = plain.options.draftAndPublish;
    plain.options.draftAndPublish = true;

    try {
      const { queriedTables } = setupStrapi({
        tables: {
          dp_hosts_cmps: linkIds.slice(0, 500).map((id) => owns(10, LINK_UID, id)),
          plain_hosts_cmps: [owns(20, LINK_UID, 501)],
        },
      });

      const kept = await filterRelationsToPropagate(linkRelations(linkIds), linkSchema, {});

      expect(kept).toEqual([]);
      expect(queriedTables).toEqual(['dp_hosts_cmps', 'dp_hosts_cmps', 'plain_hosts_cmps']);
    } finally {
      plain.options.draftAndPublish = previous;
    }
  });

  it('does not stop before a later draft-and-publish parent that owns a remaining id', async () => {
    const dp = contentTypes[DP_HOST_UID] as any;
    const plain = contentTypes[PLAIN_HOST_UID] as any;
    const previousDp = dp.options.draftAndPublish;
    const previousPlain = plain.options.draftAndPublish;
    dp.options.draftAndPublish = false;
    plain.options.draftAndPublish = true;

    try {
      const { queriedTables } = setupStrapi({
        tables: {
          dp_hosts_cmps: [owns(10, LINK_UID, 1)],
          plain_hosts_cmps: [owns(20, LINK_UID, 2)],
        },
      });

      const kept = await filterRelationsToPropagate(linkRelations([1, 2]), linkSchema, {});

      expect(kept.map((relation) => relation.link_id)).toEqual([1]);
      expect(queriedTables).toEqual(['dp_hosts_cmps', 'plain_hosts_cmps']);
    } finally {
      dp.options.draftAndPublish = previousDp;
      plain.options.draftAndPublish = previousPlain;
    }
  });

  it('resolves two levels of nesting and does not confuse equal ids of different component types', async () => {
    const SECTION_UID = 'default.section';
    components[SECTION_UID] = {
      uid: SECTION_UID,
      modelType: 'component',
      modelName: 'section',
      collectionName: 'components_default_sections',
      attributes: { card: { type: 'component', component: CARD_UID } },
    } as any;

    const dpBlocks = (contentTypes[DP_HOST_UID] as any).attributes.blocks.components as string[];
    const plainBlocks = (contentTypes[PLAIN_HOST_UID] as any).attributes.blocks
      .components as string[];
    dpBlocks.push(SECTION_UID);
    plainBlocks.push(SECTION_UID);

    try {
      // Link 5 → card 5 → section 5 → draft-and-publish host.
      // Link 6 → card 6 → section 6 → plain host.
      // The shared id 5 must not be treated as the link's direct parent.
      setupStrapi({
        tables: {
          dp_hosts_cmps: [owns(10, SECTION_UID, 5)],
          plain_hosts_cmps: [owns(20, SECTION_UID, 6)],
          components_default_sections_cmps: [owns(5, CARD_UID, 5), owns(6, CARD_UID, 6)],
          components_default_cards_cmps: [owns(5, LINK_UID, 5), owns(6, LINK_UID, 6)],
        },
        registeredTables: [
          'dp_hosts_cmps',
          'plain_hosts_cmps',
          'components_default_cards_cmps',
          'components_default_sections_cmps',
        ],
      });

      const kept = await filterRelationsToPropagate(linkRelations([5, 6]), linkSchema, {});

      expect(kept.map((relation) => relation.link_id)).toEqual([6]);
    } finally {
      delete components[SECTION_UID];
      dpBlocks.pop();
      plainBlocks.pop();
    }
  });
});
