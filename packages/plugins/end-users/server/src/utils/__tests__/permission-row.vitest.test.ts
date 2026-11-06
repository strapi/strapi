import { describe, expect, it } from 'vitest';

import {
  MAX_CONDITIONS_PER_ROW,
  MAX_CONDITION_PARAMS_BYTES,
  MAX_FIELDS_PER_ROW,
  MAX_PERMISSIONS_PER_ROLE,
  MAX_STRING_LENGTH,
  permissionRefusal,
  refuseDuplicatePermissions,
  toPermissionChanges,
  toPermissionDiff,
  toPermissionRow,
  toPermissionRows,
  toStoredDiff,
} from '../permission-row';

/** `JSON.parse` makes `__proto__` an own key, which is how a body or an import file can carry it. */
const fromJson = (json: string) => JSON.parse(json) as unknown;

describe('permission rows', () => {
  describe('what is stored of properties and conditions', () => {
    it('keeps fields, locales and populateDepth, and nothing else', () => {
      const row = toPermissionRow(
        fromJson(`{
          "action": "a.b.c",
          "properties": {
            "fields": ["title"],
            "locales": null,
            "populateDepth": 2,
            "unknown": "kept?",
            "__proto__": { "polluted": true }
          }
        }`)
      );

      expect(row.properties).toEqual({ fields: ['title'], locales: null, populateDepth: 2 });
      expect(Object.keys(row.properties).sort()).toEqual(['fields', 'locales', 'populateDepth']);
      expect(Object.prototype.hasOwnProperty.call(row.properties, '__proto__')).toBe(false);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('leaves out what was not given instead of storing it as undefined', () => {
      const { properties } = toPermissionRow({
        action: 'a.b.c',
        properties: { fields: ['title'], locales: undefined },
      });

      expect(Object.keys(properties)).toEqual(['fields']);
    });

    it('stores copies, not the lists of the caller', () => {
      const fields = ['title'];
      const { properties } = toPermissionRow({ action: 'a.b.c', properties: { fields } });

      expect(properties.fields).toEqual(['title']);
      expect(properties.fields).not.toBe(fields);
    });

    it('keeps the name and the params of a condition, and nothing else', () => {
      const row = toPermissionRow(
        fromJson(`{
          "action": "a.b.c",
          "conditions": [
            { "name": "is-owner", "params": { "field": "owner" }, "unknown": 1, "__proto__": { "x": 1 } },
            { "name": "is-admin" }
          ]
        }`)
      );

      expect(row.conditions).toEqual([
        { name: 'is-owner', params: { field: 'owner' } },
        { name: 'is-admin' },
      ]);
      expect(Object.keys(row.conditions[0]).sort()).toEqual(['name', 'params']);
      expect(Object.keys(row.conditions[1])).toEqual(['name']);
      expect(Object.prototype.hasOwnProperty.call(row.conditions[0], '__proto__')).toBe(false);
    });

    it('drops __proto__, constructor and prototype from the params of a condition, at any depth', () => {
      const [condition] = toPermissionRow(
        fromJson(`{
          "action": "a.b.c",
          "conditions": [{
            "name": "is-owner",
            "params": {
              "__proto__": { "polluted": true },
              "constructor": { "prototype": { "polluted": true } },
              "field": "owner",
              "nested": { "__proto__": { "polluted": true }, "list": [{ "prototype": 1, "ok": 2 }] }
            }
          }]
        }`)
      ).conditions;

      expect(condition.params).toEqual({ field: 'owner', nested: { list: [{ ok: 2 }] } });
      expect(Object.prototype.hasOwnProperty.call(condition.params, '__proto__')).toBe(false);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('stores copies of the params, not the object of the caller', () => {
      const params = { field: 'owner', list: [1, 2] };
      const [condition] = toPermissionRow({
        action: 'a.b.c',
        conditions: [{ name: 'is-owner', params }],
      }).conditions;

      expect(condition.params).toEqual(params);
      expect(condition.params).not.toBe(params);
      expect(condition.params?.list).not.toBe(params.list);
    });

    it('refuses params that are not JSON, or nest too deep', () => {
      const deep = Array.from({ length: 40 }).reduce<unknown>((inner) => ({ inner }), 1);

      for (const params of [
        { run: () => 1 },
        { when: new Date() },
        { n: Number.NaN },
        { s: Symbol('x') },
        { big: BigInt(1) },
        deep,
      ]) {
        expect(
          () => toPermissionRow({ action: 'a.b.c', conditions: [{ name: 'c', params }] }),
          String(Object.keys(params as object))
        ).toThrow(expect.objectContaining({ name: 'ValidationError' }));
      }
    });

    it('does the same for the changes of an update', () => {
      const changes = toPermissionChanges(
        fromJson(`{
          "documentId": "p1",
          "properties": { "fields": ["a"], "unknown": 1, "__proto__": { "polluted": true } },
          "conditions": [{ "name": "c", "unknown": 1 }]
        }`)
      );

      expect(changes).toEqual({
        documentId: 'p1',
        properties: { fields: ['a'] },
        conditions: [{ name: 'c' }],
      });
      expect(Object.prototype.hasOwnProperty.call(changes.properties, '__proto__')).toBe(false);
    });
  });

  describe('length', () => {
    const long = 'x'.repeat(MAX_STRING_LENGTH + 1);

    it('takes an action and a subject as long as the column', () => {
      const edge = 'x'.repeat(MAX_STRING_LENGTH);

      expect(toPermissionRow({ action: edge, subject: edge })).toMatchObject({
        action: edge,
        subject: edge,
      });
    });

    it('refuses an action or a subject that is longer, with a validation error', () => {
      expect(() => toPermissionRow({ action: long })).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringContaining('action'),
        })
      );
      expect(() => toPermissionRow({ action: 'a.b.c', subject: long })).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringContaining('subject'),
        })
      );
    });

    it('refuses it in an update too', () => {
      expect(() => toPermissionChanges({ documentId: 'p1', action: long })).toThrow(
        expect.objectContaining({ name: 'ValidationError' })
      );
      expect(() => toPermissionChanges({ documentId: 'p1', subject: long })).toThrow(
        expect.objectContaining({ name: 'ValidationError' })
      );
    });
  });

  describe('size bounds', () => {
    it('are the fixed values', () => {
      expect([
        MAX_PERMISSIONS_PER_ROLE,
        MAX_FIELDS_PER_ROW,
        MAX_CONDITIONS_PER_ROW,
        MAX_CONDITION_PARAMS_BYTES,
      ]).toEqual([5_000, 1_000, 20, 4_096]);
    });

    const names = (count: number, name: (n: number) => unknown) =>
      Array.from({ length: count }, (_, n) => name(n));

    // What each bound is checked on: a list of rows, the fields of a row, the conditions of a row
    const exceed: Record<string, (count: number) => unknown> = {
      rows: (count) => toPermissionRows(names(count, (n) => ({ action: `a.b.action${n}` }))),
      fields: (count) =>
        toPermissionRow({
          action: 'a.b.c',
          properties: { fields: names(count, (n) => `field${n}`) },
        }),
      conditions: (count) =>
        toPermissionRow({
          action: 'a.b.c',
          conditions: names(count, () => ({ name: 'is-owner' })),
        }),
    };

    it.each([
      ['rows', 5_001, /5,000/],
      ['fields', 1_001, /1,000/],
      ['conditions', 21, /20 conditions/],
    ])('refuses too many %s, naming the limit', (what, count, limit) => {
      expect(() => exceed[what](count)).toThrow(
        expect.objectContaining({ name: 'ValidationError', message: expect.stringMatching(limit) })
      );
    });

    it.each([
      ['rows', 5_000],
      ['fields', 1_000],
      ['conditions', 20],
    ])('takes as many %s as the limit', (what, count) => {
      expect(() => exceed[what](count)).not.toThrow();
    });

    it('checks a bound before anything else about what it bounds', () => {
      // 21 conditions that are not conditions, and a list of fields that are not names: the limit is
      // what is said, not what each one is wrong with
      expect(() =>
        toPermissionRow({ action: 'a.b.c', conditions: names(21, () => 'bad') })
      ).toThrow(/at most 20 conditions/);
      expect(() =>
        toPermissionRow({ action: 'a.b.c', properties: { fields: names(1_001, () => 7) } })
      ).toThrow(/at most 1,000 fields/);
      expect(() => toPermissionRows(names(5_001, () => 'not a row'))).toThrow(/at most 5,000/);
    });

    it('leaves a null list of fields, every field, without a bound', () => {
      expect(toPermissionRow({ action: 'a.b.c', properties: { fields: null } }).properties).toEqual(
        {
          fields: null,
        }
      );
    });

    it('applies to the changes of an update as to a row', () => {
      expect(() =>
        toPermissionChanges({
          documentId: 'p1',
          properties: { fields: names(1_001, (n) => `field${n}`) },
        })
      ).toThrow(/1,000/);
      expect(() =>
        toPermissionChanges({ documentId: 'p1', conditions: names(21, () => ({ name: 'c' })) })
      ).toThrow(/20/);
    });

    describe('the params of a condition', () => {
      // `{"v":""}` is 8 bytes of JSON
      const withParams = (params: Record<string, unknown>) =>
        toPermissionRow({ action: 'a.b.c', conditions: [{ name: 'c', params }] });

      it('are at most 4,096 bytes of JSON', () => {
        expect(() => withParams({ v: 'x'.repeat(MAX_CONDITION_PARAMS_BYTES - 8) })).not.toThrow();
        expect(() => withParams({ v: 'x'.repeat(MAX_CONDITION_PARAMS_BYTES - 7) })).toThrow(
          expect.objectContaining({
            name: 'ValidationError',
            message: expect.stringContaining('4,096'),
          })
        );
      });

      it('count bytes, not characters', () => {
        // 2,100 characters of two bytes each
        expect(() => withParams({ v: 'é'.repeat(2_100) })).toThrow(/4,096 bytes/);
      });

      it('are measured as they are stored, without the keys that are dropped', () => {
        const row = withParams(
          fromJson(`{ "v": "x", "__proto__": { "pad": "${'p'.repeat(5_000)}" } }`) as Record<
            string,
            unknown
          >
        );

        expect(row.conditions[0].params).toEqual({ v: 'x' });
      });
    });

    describe('in a diff', () => {
      it.each(['create', 'update', 'delete'])(
        'refuses a %s longer than a role may be, naming the limit',
        (key) => {
          expect(() => toPermissionDiff({ [key]: names(5_001, () => 'x') })).toThrow(
            expect.objectContaining({
              name: 'ValidationError',
              message: expect.stringContaining(`permissions.${key}`),
            })
          );
          expect(() => toPermissionDiff({ [key]: names(5_001, () => 'x') })).toThrow(/5,000/);
          expect(() => toPermissionDiff({ [key]: names(5_000, () => 'x') })).not.toThrow();
        }
      );
    });
  });

  describe('a stored diff', () => {
    it('has each created row and each change rebuilt, and its ids checked', () => {
      const diff = toStoredDiff(
        fromJson(`{
          "create": [{ "action": "a.b.c", "isAdmin": true, "properties": { "extra": 1 } }],
          "update": [{ "documentId": "p1", "properties": { "fields": ["a"], "extra": 1 } }],
          "delete": ["p2"]
        }`)
      );

      expect(diff).toEqual({
        create: [{ action: 'a.b.c', subject: null, properties: {}, conditions: [] }],
        update: [{ documentId: 'p1', properties: { fields: ['a'] } }],
        delete: ['p2'],
      });
    });

    it('is refused for what is wrong with its shape, a row, a change or an id', () => {
      for (const bad of [
        null,
        { create: [{ action: '' }] },
        { update: [{ action: 'a.b.c' }] },
        { delete: [''] },
        { delete: [7] },
        { other: [] },
      ]) {
        expect(() => toStoredDiff(bad), JSON.stringify(bad)).toThrow(
          expect.objectContaining({ name: 'ValidationError' })
        );
      }
    });

    it('is the same again when it is rebuilt', () => {
      const once = toStoredDiff({
        create: [{ action: 'a.b.c', properties: { fields: ['x'] } }],
        update: [{ documentId: 'p1', subject: null }],
        delete: [],
      });

      expect(toStoredDiff(once)).toEqual(once);
    });

    describe('a documentId named twice', () => {
      it('is refused when two changes name the same permission, naming its documentId', () => {
        // Each change is valid over the stored row on its own; applied in order they store another row
        const bad = {
          update: [
            { documentId: 'p1', action: 'a.b.find', properties: { fields: ['y'] } },
            { documentId: 'p2', subject: null },
            { documentId: 'p1', properties: { fields: ['x'] } },
          ],
        };

        expect(() => toStoredDiff(bad)).toThrow(
          expect.objectContaining({
            name: 'ValidationError',
            message: expect.stringContaining('p1'),
          })
        );
        expect(() => toStoredDiff(bad)).toThrow(/more than once/);
      });

      it('is refused when a permission is in both update and delete, naming its documentId', () => {
        const bad = {
          update: [{ documentId: 'p1', properties: { fields: ['x'] } }],
          delete: ['p2', 'p1'],
        };

        expect(() => toStoredDiff(bad)).toThrow(
          expect.objectContaining({
            name: 'ValidationError',
            message: expect.stringContaining('p1'),
          })
        );
        expect(() => toStoredDiff(bad)).toThrow(/both changed and deleted/);
      });

      it('passes a diff whose changes and deletes name each permission once', () => {
        const diff = toStoredDiff({
          create: [{ action: 'a.b.c' }],
          update: [
            { documentId: 'p1', properties: { fields: ['x'] } },
            { documentId: 'p2', subject: null },
          ],
          delete: ['p3', 'p4'],
        });

        expect(diff.update.map(({ documentId }) => documentId)).toEqual(['p1', 'p2']);
        expect(diff.delete).toEqual(['p3', 'p4']);
      });
    });
  });

  describe('a documentId that is not canonical', () => {
    // The database compares ids by its collation (case-insensitively on MySQL): an id is only what
    // Strapi writes, lowercase letters and digits, or it names no row
    const NOT_CANONICAL = [
      ['an upper-case variant of a stored id', 'ABC123'],
      ['a mixed-case id', 'aBc123'],
      ['a dash', 'abc-123'],
      ['an underscore', 'abc_123'],
      ['a leading space', ' abc123'],
      ['a trailing space', 'abc123 '],
      ['a trailing newline', 'abc123\n'],
      ['a space inside', 'abc 123'],
      ['a non-ASCII letter', 'ábc123'],
      ['a path', '../abc123'],
      ['65 characters', 'a'.repeat(65)],
    ] as const;

    it('is accepted for 1 to 64 lowercase letters and digits, in update and delete', () => {
      const updated = ['p1', '7', 'abc123', 'z0y8x7w6v5u4t3s2r1q0p9o8', 'a'.repeat(64)];
      const deleted = ['d1', '8', 'def456', 'q0w9e8r7t6y5u4i3o2p1a0s9', 'b'.repeat(64)];
      const diff = toStoredDiff({
        update: updated.map((documentId) => ({ documentId, subject: null })),
        delete: deleted,
      });

      expect(diff.update.map(({ documentId }) => documentId)).toEqual(updated);
      expect(diff.delete).toEqual(deleted);
    });

    it.each(NOT_CANONICAL)('is refused in an update, with a 400: %s', (_what, documentId) => {
      for (const parse of [
        () => toStoredDiff({ update: [{ documentId, subject: null }] }),
        () => toPermissionChanges({ documentId, subject: null }),
      ]) {
        expect(parse).toThrow(
          expect.objectContaining({
            name: 'ValidationError',
            message: expect.stringContaining('documentId'),
          })
        );
      }
    });

    it.each(NOT_CANONICAL)('is refused in a delete, with a 400: %s', (_what, documentId) => {
      expect(() => toStoredDiff({ delete: ['p1', documentId] })).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringContaining('documentId'),
        })
      );
    });

    it('is refused without saying what it was, so a long or odd id is not echoed back', () => {
      const odd = `${'x'.repeat(200)}<script>`;

      for (const parse of [
        () => toStoredDiff({ update: [{ documentId: odd }] }),
        () => toStoredDiff({ delete: [odd] }),
      ]) {
        expect(parse).toThrow(expect.objectContaining({ name: 'ValidationError' }));
        expect(parse).not.toThrow(/script|xxxx/);
      }
    });

    it('is left alone in a created row, which has no documentId', () => {
      expect(toStoredDiff({ create: [{ action: 'a.b.c', documentId: 'ABC-123' }] }).create).toEqual(
        [{ action: 'a.b.c', subject: null, properties: {}, conditions: [] }]
      );
    });
  });

  describe('the refusal of a row the checks found a problem with', () => {
    const problem = {
      index: 2,
      action: 'api::nope.nope.find',
      key: 'action',
      reason: 'no route',
    } as const;

    it('names the row by its place in the list, and points at its part', () => {
      const error = permissionRefusal(problem);

      expect(error).toMatchObject({
        name: 'ValidationError',
        message: 'Permission 2 (api::nope.nope.find): no route',
        details: {
          errors: [
            {
              path: ['permissions', 2, 'action'],
              message: 'Permission 2 (api::nope.nope.find): no route',
              name: 'ValidationError',
            },
          ],
        },
      });
    });

    it.each(['create', 'update'] as const)('points into the %s of a diff', (part) => {
      expect(permissionRefusal(problem, part).details).toEqual({
        errors: [expect.objectContaining({ path: ['permissions', part, 2, 'action'] })],
      });
    });
  });

  describe('a diff', () => {
    it('is an object with create, update and delete, each of them a list when it is there', () => {
      expect(toPermissionDiff({ create: [], update: [], delete: [] })).toEqual({
        create: [],
        update: [],
        delete: [],
      });
      expect(toPermissionDiff({ create: [{ action: 'a.b.c' }] })).toEqual({
        create: [{ action: 'a.b.c' }],
        update: [],
        delete: [],
      });
      expect(toPermissionDiff({})).toEqual({ create: [], update: [], delete: [] });
    });

    it.each([
      ['a list of permissions', [{ action: 'a.b.c' }]],
      ['null', null],
      ['undefined', undefined],
      ['a string', 'create'],
      ['the whole list under another name', { permissions: [{ action: 'a.b.c' }] }],
      ['a diff with a key it does not know', { create: [], upsert: [] }],
      ['a create that is not a list', { create: { action: 'a.b.c' } }],
      ['an update that is not a list', { update: 'p1' }],
      ['a delete that is not a list', { delete: 'p1' }],
      ['a null list', { create: null }],
    ])('refuses %s', (_label, value) => {
      expect(() => toPermissionDiff(value)).toThrow(
        expect.objectContaining({ name: 'ValidationError' })
      );
    });
  });

  describe('the same action on the same subject', () => {
    // Core's `subjectOf`: the content type whose controller owns the action, when it is one
    const subjectOf = (action: string) =>
      action.startsWith('api::note.note.') ? 'api::note.note' : null;

    it('is refused, naming both', () => {
      expect(() =>
        refuseDuplicatePermissions(
          [
            { action: 'api::note.note.find', subject: 'api::note.note' },
            { action: 'api::note.note.find', subject: 'api::note.note' },
          ],
          subjectOf
        )
      ).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/"api::note\.note\.find".*"api::note\.note"/),
        })
      );
    });

    it('is refused for two rows with no subject, which a database index would let through', () => {
      expect(() =>
        refuseDuplicatePermissions(
          [
            { action: 'plugin::end-users.me.find', subject: null },
            { action: 'plugin::end-users.me.find', subject: null },
          ],
          subjectOf
        )
      ).toThrow(expect.objectContaining({ message: expect.stringContaining('no subject') }));
    });

    it("compares a row with no subject by its action's content type", () => {
      expect(() =>
        refuseDuplicatePermissions(
          [
            { action: 'api::note.note.find', subject: null },
            { action: 'api::note.note.find', subject: 'api::note.note' },
          ],
          subjectOf
        )
      ).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/"api::note\.note\.find" on "api::note\.note"/),
        })
      );
    });

    it('lets the same action on different subjects through, and a subject and none', () => {
      expect(() =>
        refuseDuplicatePermissions(
          [
            { action: 'find', subject: 'api::a.a' },
            { action: 'find', subject: 'api::b.b' },
            { action: 'find', subject: null },
            { action: 'findOne', subject: null },
            // Stored under another type than its action's: a row of its own
            { action: 'api::note.note.find', subject: null },
            { action: 'api::note.note.find', subject: 'api::a.a' },
          ],
          subjectOf
        )
      ).not.toThrow();
    });
  });
});
