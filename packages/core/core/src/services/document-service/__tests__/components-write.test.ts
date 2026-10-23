import { updateComponents, deleteComponents, isComponentUnchanged } from '../components';

const PAGE_UID = 'api::page.page';
const LINK_UID = 'monster.links';
const SECTION_UID = 'monster.section';
// registered, but not part of the zone of the page
const LEGACY_UID = 'monster.legacy';

const models: Record<string, any> = {
  [PAGE_UID]: {
    uid: PAGE_UID,
    modelType: 'contentType',
    attributes: {
      title: { type: 'string' },
      links: { type: 'component', component: LINK_UID, repeatable: true },
      hero: { type: 'component', component: LINK_UID, repeatable: false },
      sections: { type: 'component', component: SECTION_UID, repeatable: true },
      zone: { type: 'dynamiczone', components: [LINK_UID, SECTION_UID] },
    },
  },
  [LINK_UID]: {
    uid: LINK_UID,
    modelType: 'component',
    attributes: {
      title: { type: 'string' },
      tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
      image: { type: 'media', multiple: false },
    },
  },
  [SECTION_UID]: {
    uid: SECTION_UID,
    modelType: 'component',
    attributes: {
      title: { type: 'string' },
      links: { type: 'component', component: LINK_UID, repeatable: true },
    },
  },
  [LEGACY_UID]: {
    uid: LEGACY_UID,
    modelType: 'component',
    attributes: {
      title: { type: 'string' },
    },
  },
};

const NOOP_RELATION = { connect: [], disconnect: [] };
const MEDIA_POPULATE = { populate: { image: { select: ['id'] } } };

type Stored = Record<string, Record<string, unknown>>;

/**
 * `stored[uid][entityId][attribute]` is what `strapi.db.query(uid).load(entity, attribute)` returns.
 */
const setup = (stored: Record<string, Stored>) => {
  let nextId = 100;
  const queries = Object.fromEntries(
    Object.keys(models).map((uid) => [
      uid,
      {
        load: jest.fn(
          async (entity: { id: number }, attribute: string | string[], params?: any) => {
            const read = (name: string) => {
              const value = stored[uid]?.[entity.id]?.[name] ?? null;

              // like the DB layer, only the component types listed in `on` are returned
              return params?.on && Array.isArray(value)
                ? value.filter((row: any) => row.__component in params.on)
                : value;
            };
            return Array.isArray(attribute)
              ? Object.fromEntries(attribute.map((name) => [name, read(name)]))
              : read(attribute);
          }
        ),
        deleteMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
        create: jest.fn(async () => {
          nextId += 1;
          return { id: nextId - 1 };
        }),
        delete: jest.fn(async () => ({})),
      },
    ])
  );

  // `strapi.db.queryBuilder(uid).init(params).execute()` returns the stored rows asked for by id
  const builders: Record<string, { init: jest.Mock; execute: jest.Mock }> = {};
  const queryBuilder = jest.fn((uid: string) => {
    if (!builders[uid]) {
      let params: { where: { id: { $in: number[] } } };
      const builder = {
        init: jest.fn((value: typeof params) => {
          params = value;
          return builder;
        }),
        execute: jest.fn(async () =>
          params.where.id.$in.map((id) => ({ id, ...stored[uid]?.[id] }))
        ),
      };
      builders[uid] = builder;
    }

    return builders[uid];
  });

  const db = {
    query: jest.fn((uid: string) => queries[uid]),
    queryBuilder,
    transaction: jest.fn(async (run: (ctx: { trx: string }) => unknown) => run({ trx: 'trx' })),
    entityManager: { deleteManyRelations: jest.fn(async () => undefined) },
    lifecycles: { hasSubscribers: jest.fn(() => false) },
  };

  global.strapi = {
    getModel: jest.fn((uid: string) => models[uid]),
    components: Object.fromEntries(
      Object.entries(models).filter(([, model]) => model.modelType === 'component')
    ),
    db,
  } as any;

  return Object.assign(queries, { db, builders });
};

const link = (id: number, title: string, image: unknown = null) => ({ id, title, image });
const linkInput = (id: number | undefined, title: string, image: unknown = null) => ({
  ...(id === undefined ? {} : { id }),
  title,
  tags: NOOP_RELATION,
  image,
});

const pivot = (field: string, component_type: string) => ({ field, component_type });

describe('updateComponents', () => {
  const page = { id: 10 };

  describe('repeatable component', () => {
    const storedLinks = [link(1, 'a', { id: 7 }), link(2, 'b')];

    it('writes nothing when the components are sent as they are stored', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 7 }]), linkInput(2, 'b')],
      } as any);

      expect(result).toEqual({});
      expect(queries[PAGE_UID].load).toHaveBeenCalledWith(page, 'links', MEDIA_POPULATE);
      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
      expect(queries[LINK_UID].create).not.toHaveBeenCalled();
      expect(queries[LINK_UID].delete).not.toHaveBeenCalled();
    });

    it('updates only the component whose data changed and reports the list', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 7 }]), linkInput(2, 'b updated')],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
      expect(queries[LINK_UID].update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: expect.objectContaining({ title: 'b updated' }),
      });
      expect(result).toEqual({
        links: [
          { id: 1, __pivot: pivot('links', LINK_UID) },
          { id: 2, __pivot: pivot('links', LINK_UID) },
        ],
      });
    });

    it('reports the list when its order changed, without updating the components', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(2, 'b'), linkInput(1, 'a', [{ id: 7 }])],
      } as any);

      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
      expect(result.links).toEqual([
        { id: 2, __pivot: pivot('links', LINK_UID) },
        { id: 1, __pivot: pivot('links', LINK_UID) },
      ]);
    });

    it('creates the components sent without an id', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 7 }]), linkInput(2, 'b'), linkInput(undefined, 'c')],
      } as any);

      expect(queries[LINK_UID].create).toHaveBeenCalledTimes(1);
      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
      expect(result.links.map((item: any) => item.id)).toEqual([1, 2, 100]);
    });

    it('deletes the components that are no longer sent', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 7 }])],
      } as any);

      // ids of removed components are compared and passed as strings
      expect(queries[LINK_UID].delete).toHaveBeenCalledWith({ where: { id: '2' } });
      expect(result.links.map((item: any) => item.id)).toEqual([1]);
    });

    it('writes the components as before when a lifecycle subscriber listens to their updates', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });
      queries.db.lifecycles.hasSubscribers.mockImplementation(
        (action: string, uid: string) => action === 'afterUpdate' && uid === LINK_UID
      );

      const result = await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 7 }]), linkInput(2, 'b')],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(2);
      expect(result.links.map((component: any) => component.id)).toEqual([1, 2]);
    });

    it('treats a relation with connections as a change', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      await updateComponents(PAGE_UID, page, {
        links: [
          { ...linkInput(1, 'a', [{ id: 7 }]), tags: { connect: [{ id: 5 }], disconnect: [] } },
          linkInput(2, 'b'),
        ],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
      expect(queries[LINK_UID].update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );
    });

    it('treats a different media as a change', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', [{ id: 8 }]), linkInput(2, 'b')],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
      expect(queries[LINK_UID].update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );
    });

    it('treats a removed media as a change', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { links: storedLinks } } });

      await updateComponents(PAGE_UID, page, {
        links: [linkInput(1, 'a', null), linkInput(2, 'b')],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
    });
  });

  describe('single component', () => {
    it('writes nothing when the component is sent as it is stored', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { hero: link(3, 'hero') } } });

      const result = await updateComponents(PAGE_UID, page, { hero: linkInput(3, 'hero') } as any);

      expect(result).toEqual({});
      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
    });

    it('reports the removal of the component', async () => {
      const queries = setup({ [PAGE_UID]: { 10: { hero: link(3, 'hero') } } });

      const result = await updateComponents(PAGE_UID, page, { hero: null } as any);

      expect(queries[LINK_UID].delete).toHaveBeenCalledWith({ where: { id: '3' } });
      expect(result).toEqual({ hero: null });
    });

    it('writes nothing when the component stays empty', async () => {
      setup({ [PAGE_UID]: { 10: { hero: null } } });

      const result = await updateComponents(PAGE_UID, page, { hero: null } as any);

      expect(result).toEqual({});
    });
  });

  describe('nested components', () => {
    const stored = {
      [PAGE_UID]: { 10: { sections: [{ id: 20, title: 's' }] } },
      [SECTION_UID]: { 20: { links: [link(1, 'a'), link(2, 'b')] } },
    };

    it('writes nothing when the whole tree is sent as it is stored', async () => {
      const queries = setup(stored);

      const result = await updateComponents(PAGE_UID, page, {
        sections: [{ id: 20, title: 's', links: [linkInput(1, 'a'), linkInput(2, 'b')] }],
      } as any);

      expect(result).toEqual({});
      expect(queries[SECTION_UID].load).toHaveBeenCalledWith({ id: 20 }, 'links', MEDIA_POPULATE);
      expect(queries[SECTION_UID].update).not.toHaveBeenCalled();
      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
    });

    it('updates the parent when a nested component changed', async () => {
      const queries = setup(stored);

      const result = await updateComponents(PAGE_UID, page, {
        sections: [{ id: 20, title: 's', links: [linkInput(1, 'a'), linkInput(2, 'b updated')] }],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
      expect(queries[SECTION_UID].update).toHaveBeenCalledTimes(1);
      expect(queries[SECTION_UID].update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: expect.objectContaining({
          title: 's',
          links: [
            { id: 1, __pivot: pivot('links', LINK_UID) },
            { id: 2, __pivot: pivot('links', LINK_UID) },
          ],
        }),
      });
      expect(result.sections).toEqual([{ id: 20, __pivot: pivot('sections', SECTION_UID) }]);
    });

    it('updates the parent when a nested component is added', async () => {
      const queries = setup(stored);

      await updateComponents(PAGE_UID, page, {
        sections: [
          {
            id: 20,
            title: 's',
            links: [linkInput(1, 'a'), linkInput(2, 'b'), linkInput(undefined, 'c')],
          },
        ],
      } as any);

      expect(queries[LINK_UID].create).toHaveBeenCalledTimes(1);
      expect(queries[SECTION_UID].update).toHaveBeenCalledTimes(1);
    });
  });

  describe('dynamic zone', () => {
    const storedZone = [
      { id: 1, __component: LINK_UID, title: 'a', image: null },
      { id: 20, __component: SECTION_UID, title: 's' },
    ];
    const stored = {
      [PAGE_UID]: { 10: { zone: storedZone } },
      [SECTION_UID]: { 20: { links: [] } },
    };

    it('writes nothing when the zone is sent as it is stored', async () => {
      const queries = setup(stored);

      const result = await updateComponents(PAGE_UID, page, {
        zone: [
          { __component: LINK_UID, ...linkInput(1, 'a') },
          { __component: SECTION_UID, id: 20, title: 's', links: [] },
        ],
      } as any);

      expect(result).toEqual({});
      // every registered component is listed, not only the ones the zone declares
      expect(queries[PAGE_UID].load).toHaveBeenCalledWith(page, 'zone', {
        on: { [LINK_UID]: MEDIA_POPULATE, [SECTION_UID]: {}, [LEGACY_UID]: {} },
      });
      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
      expect(queries[SECTION_UID].update).not.toHaveBeenCalled();
    });

    it('reports the zone when a block changed', async () => {
      const queries = setup(stored);

      const result = await updateComponents(PAGE_UID, page, {
        zone: [
          { __component: LINK_UID, ...linkInput(1, 'a updated') },
          { __component: SECTION_UID, id: 20, title: 's', links: [] },
        ],
      } as any);

      expect(queries[LINK_UID].update).toHaveBeenCalledTimes(1);
      expect(result.zone).toEqual([
        { id: 1, __component: LINK_UID, __pivot: { field: 'zone' } },
        { id: 20, __component: SECTION_UID, __pivot: { field: 'zone' } },
      ]);
    });

    it('reports the zone when the blocks were reordered', async () => {
      const queries = setup(stored);

      const result = await updateComponents(PAGE_UID, page, {
        zone: [
          { __component: SECTION_UID, id: 20, title: 's', links: [] },
          { __component: LINK_UID, ...linkInput(1, 'a') },
        ],
      } as any);

      expect(queries[LINK_UID].update).not.toHaveBeenCalled();
      expect(result.zone.map((block: any) => block.id)).toEqual([20, 1]);
    });

    it('deletes a block whose type the zone no longer declares', async () => {
      const queries = setup({
        ...stored,
        [PAGE_UID]: {
          10: { zone: [...storedZone, { id: 30, __component: LEGACY_UID, title: 'old' }] },
        },
      });

      const result = await updateComponents(PAGE_UID, page, {
        zone: [
          { __component: LINK_UID, ...linkInput(1, 'a') },
          { __component: SECTION_UID, id: 20, title: 's', links: [] },
        ],
      } as any);

      expect(queries[LEGACY_UID].delete).toHaveBeenCalledWith({ where: { id: '30' } });
      expect(result.zone.map((block: any) => block.id)).toEqual([1, 20]);
    });
  });
});

describe('isComponentUnchanged', () => {
  const schema = {
    uid: 'test.all-types',
    attributes: {
      string: { type: 'string' },
      bool: { type: 'boolean' },
      int: { type: 'integer' },
      dec: { type: 'decimal' },
      big: { type: 'biginteger' },
      day: { type: 'date' },
      clock: { type: 'time' },
      when: { type: 'datetime' },
      stamp: { type: 'timestamp' },
      json: { type: 'json' },
      secret: { type: 'password' },
      tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
      image: { type: 'media', multiple: true },
    },
  } as any;

  const check = (stored: Record<string, unknown>, data: Record<string, unknown>) =>
    isComponentUnchanged(schema, stored, data);

  it('ignores attributes that are not sent', () => {
    expect(check({ string: 'a', bool: true }, {})).toBe(true);
  });

  it('compares scalars after normalizing how they are loaded and sent', () => {
    expect(check({ string: 'a' }, { string: 'a' })).toBe(true);
    expect(check({ string: 'a' }, { string: 'b' })).toBe(false);
    expect(check({ bool: false }, { bool: false })).toBe(true);
    expect(check({ bool: false }, { bool: 'false' })).toBe(false);
    expect(check({ int: 3 }, { int: '3' })).toBe(true);
    expect(check({ dec: 12.5 }, { dec: '12.50' })).toBe(true);
    expect(check({ big: '9007199254740993' }, { big: '9007199254740993' })).toBe(true);
    expect(check({ big: '9007199254740993' }, { big: '9007199254740994' })).toBe(false);
    expect(check({ day: '2026-10-16' }, { day: '2026-10-16' })).toBe(true);
    expect(check({ day: '2026-10-16' }, { day: '2026-10-17' })).toBe(false);
    expect(check({ clock: '10:30:00.000' }, { clock: '10:30:00' })).toBe(true);
    expect(check({ clock: '10:30:00.000' }, { clock: '10:31:00' })).toBe(false);
    expect(
      check({ when: '2026-10-16T10:00:00.000Z' }, { when: '2026-10-16T12:00:00.000+02:00' })
    ).toBe(true);
    expect(check({ when: '2026-10-16T10:00:00.000Z' }, { when: '2026-10-16T10:00:01.000Z' })).toBe(
      false
    );
    // timestamps are loaded as epoch strings
    expect(
      check({ stamp: String(Date.UTC(2026, 9, 16, 10)) }, { stamp: '2026-10-16T10:00:00.000Z' })
    ).toBe(true);
    expect(check({ json: { a: 1, b: [2] } }, { json: { b: [2], a: 1 } })).toBe(true);
    expect(check({ json: { a: 1 } }, { json: '{"a":1}' })).toBe(true);
    expect(check({ json: { a: 1 } }, { json: { a: 2 } })).toBe(false);
  });

  it('treats null and a value as a change, and null and null as no change', () => {
    expect(check({ string: null }, { string: null })).toBe(true);
    expect(check({ string: null }, { string: '' })).toBe(false);
    expect(check({ int: 0 }, { int: null })).toBe(false);
  });

  it('treats a date or time the database would reject as a change', () => {
    // the database layer wants HH:mm:ss.SSS: writing this is a validation error, not a no-op
    expect(check({ clock: '10:30:00.000' }, { clock: '10:30' })).toBe(false);
    expect(check({ day: '2026-10-16' }, { day: 'yesterday' })).toBe(false);
    expect(check({ when: '2026-10-16T10:00:00.000Z' }, { when: 'not a date' })).toBe(false);
  });

  it('assumes a change for passwords, unknown values and attributes that were not loaded', () => {
    expect(check({ secret: 'hash' }, { secret: 'hash' })).toBe(false);
    expect(check({}, { string: 'a' })).toBe(false);
    expect(check({ int: 3 }, { int: 'three' })).toBe(false);
  });

  it('only accepts relations sent without connections or disconnections', () => {
    expect(check({}, { tags: NOOP_RELATION })).toBe(true);
    expect(check({}, { tags: { connect: [], disconnect: [], options: { strict: true } } })).toBe(
      true
    );
    expect(check({}, { tags: { connect: [{ id: 1 }], disconnect: [] } })).toBe(false);
    expect(check({}, { tags: { set: [] } })).toBe(false);
    expect(check({}, { tags: [1, 2] })).toBe(false);
    expect(check({}, { tags: null })).toBe(false);
  });

  it('compares media by id and order', () => {
    const stored = { image: [{ id: 1 }, { id: 2 }] };
    expect(check(stored, { image: [{ id: 1 }, { id: 2 }] })).toBe(true);
    expect(check(stored, { image: [1, 2] })).toBe(true);
    expect(check(stored, { image: { set: [{ id: 1 }, { id: 2 }] } })).toBe(true);
    expect(check(stored, { image: NOOP_RELATION })).toBe(true);
    expect(check(stored, { image: [{ id: 2 }, { id: 1 }] })).toBe(false);
    expect(check(stored, { image: [{ id: 1 }] })).toBe(false);
    expect(check(stored, { image: null })).toBe(false);
    expect(check({ image: null }, { image: null })).toBe(true);
    expect(check({ image: { id: 1 } }, { image: { id: 1 } })).toBe(true);
    expect(check({ image: { id: 1 } }, { image: [{ documentId: 'x' }] })).toBe(false);
  });
});

describe('deleteComponents', () => {
  const entry = {
    id: 10,
    links: [{ id: 1 }, { id: 2 }],
    sections: [{ id: 20 }],
    zone: [
      { id: 4, __component: LINK_UID },
      { id: 21, __component: SECTION_UID },
    ],
  };
  const stored = {
    [SECTION_UID]: { 20: { links: [{ id: 3 }] }, 21: { links: [] } },
  };

  it('removes the whole tree with one statement per component type and per relation', async () => {
    const queries = setup(stored);

    await deleteComponents(PAGE_UID, entry as any, { loadComponents: false });

    // nested components are fetched by type, not one parent at a time, and without lifecycles
    expect(queries.builders[SECTION_UID].init).toHaveBeenCalledTimes(1);
    expect(queries.builders[SECTION_UID].init).toHaveBeenCalledWith({
      where: { id: { $in: [20, 21] } },
      select: ['id'],
      populate: { links: { select: ['id'] } },
    });
    expect(queries.builders[LINK_UID]).toBeUndefined();

    const { deleteManyRelations } = queries.db.entityManager;
    expect(deleteManyRelations).toHaveBeenCalledWith(LINK_UID, [1, 2, 4, 3], {
      transaction: 'trx',
    });
    expect(deleteManyRelations).toHaveBeenCalledWith(SECTION_UID, [20, 21], { transaction: 'trx' });
    expect(queries[LINK_UID].deleteMany).toHaveBeenCalledWith({
      where: { id: { $in: [1, 2, 4, 3] } },
    });
    expect(queries[SECTION_UID].deleteMany).toHaveBeenCalledWith({
      where: { id: { $in: [20, 21] } },
    });
    expect(queries[LINK_UID].delete).not.toHaveBeenCalled();
    expect(queries[SECTION_UID].delete).not.toHaveBeenCalled();
    expect(queries.db.transaction).toHaveBeenCalledTimes(1);
  });

  it('loads the first level when asked to', async () => {
    const queries = setup({ ...stored, [PAGE_UID]: { 10: { links: [{ id: 1 }] } } });

    await deleteComponents(PAGE_UID, { id: 10 } as any);

    expect(queries[PAGE_UID].load).toHaveBeenCalledWith({ id: 10 }, [
      'links',
      'hero',
      'sections',
      'zone',
    ]);
    expect(queries.db.entityManager.deleteManyRelations).toHaveBeenCalledWith(LINK_UID, [1], {
      transaction: 'trx',
    });
  });

  it('does nothing when the entry holds no component', async () => {
    const queries = setup({});

    await deleteComponents(PAGE_UID, { id: 10, links: [], sections: null, zone: [] } as any, {
      loadComponents: false,
    });

    expect(queries.db.transaction).not.toHaveBeenCalled();
  });

  it('deletes the components one by one when a lifecycle subscriber listens to one of them', async () => {
    const queries = setup(stored);
    queries.db.lifecycles.hasSubscribers.mockImplementation(
      (action: string, uid: string) => action === 'afterDelete' && uid === LINK_UID
    );

    await deleteComponents(PAGE_UID, entry as any, { loadComponents: false });

    expect(queries.db.entityManager.deleteManyRelations).not.toHaveBeenCalled();
    expect(queries[LINK_UID].deleteMany).not.toHaveBeenCalled();
    // attribute by attribute: links, then the nested link of the section, then the zone
    expect(queries[LINK_UID].delete.mock.calls.map(([params]: any) => params.where.id)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(queries[SECTION_UID].delete.mock.calls.map(([params]: any) => params.where.id)).toEqual([
      20, 21,
    ]);
  });

  it('deletes the components one by one when a subscriber listens to their bulk deletion', async () => {
    const queries = setup(stored);
    queries.db.lifecycles.hasSubscribers.mockImplementation(
      (action: string, uid: string) => action === 'afterDeleteMany' && uid === SECTION_UID
    );

    await deleteComponents(PAGE_UID, entry as any, { loadComponents: false });

    // the subscriber never received delete-many events for components: it must not start to
    expect(queries[SECTION_UID].deleteMany).not.toHaveBeenCalled();
    expect(queries[SECTION_UID].delete.mock.calls.map(([params]: any) => params.where.id)).toEqual([
      20, 21,
    ]);
    // the links under a section are a tree of their own, with nobody listening: still in bulk
    expect(queries.db.entityManager.deleteManyRelations).toHaveBeenCalledWith(LINK_UID, [3], {
      transaction: 'trx',
    });
  });
});
