import { describe, expect, it } from 'vitest';

import { upgradeVersion1 } from '../../../../../../shared/builder/upgrade';
import { fieldsFor, formProblems, toCondition, toForm } from '../builderForm';

import type { BuilderConditionV2, EntryCheck } from '../../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';
import type { BuilderForm, FormCheck } from '../builderForm';

const layout: BuilderLayout = {
  contentTypes: [
    {
      uid: 'api::article.article',
      displayName: 'Article',
      kind: 'collectionType',
      userRelations: ['author'],
      attributes: [
        { name: 'title', type: 'string' },
        { name: 'views', type: 'integer' },
        { name: 'status', type: 'enumeration', enum: ['draft', 'live', 'old'] },
        { name: 'createdAt', type: 'datetime' },
        {
          name: 'author',
          type: 'relation',
          relation: { target: 'plugin::end-users.user', toMany: false },
        },
        { name: 'tags', type: 'relation', relation: { target: 'api::tag.tag', toMany: true } },
      ],
    },
    {
      uid: 'api::page.page',
      displayName: 'Page',
      kind: 'collectionType',
      userRelations: [],
      attributes: [
        { name: 'title', type: 'string' },
        { name: 'views', type: 'string' },
        { name: 'status', type: 'enumeration', enum: ['draft', 'live'] },
        { name: 'createdAt', type: 'datetime' },
        { name: 'tags', type: 'relation', relation: { target: 'api::tag.tag', toMany: true } },
      ],
    },
    {
      uid: 'plugin::end-users.user',
      displayName: 'End user',
      kind: 'collectionType',
      userRelations: [],
      attributes: [{ name: 'email', type: 'email' }],
    },
    {
      uid: 'api::tag.tag',
      displayName: 'Tag',
      kind: 'collectionType',
      userRelations: [],
      attributes: [{ name: 'name', type: 'string' }],
    },
  ],
  userAttributes: [{ name: 'email', type: 'email' }],
  profileAttributes: [{ name: 'company', type: 'string' }],
  roles: ['Editor', 'Author'],
};

const full: BuilderConditionV2 = {
  version: 2,
  slug: 'my-articles',
  displayName: 'My articles',
  appliesTo: { kind: 'types', types: ['api::article.article'] },
  inputs: [
    { name: 'limit', kind: 'number', required: true, default: 5 },
    { name: 'label', kind: 'text', required: false, default: 'x' },
    { name: 'on', kind: 'boolean', required: false, default: false },
    { name: 'when', kind: 'field', accepts: 'date', required: true },
  ],
  who: {
    match: 'any',
    checks: [
      { kind: 'roles', match: 'any', roles: ['Editor'] },
      { kind: 'email-verified', value: true },
      {
        kind: 'attribute',
        source: 'profile',
        attribute: 'company',
        operator: '$eq',
        value: { kind: 'fixed', value: 'Acme' },
      },
    ],
  },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['title'] },
        operator: '$in',
        value: { kind: 'fixed', value: ['a', 'b'] },
      },
      {
        kind: 'check',
        target: { path: ['views'] },
        operator: '$gte',
        value: { kind: 'input', name: 'limit' },
      },
      {
        kind: 'check',
        target: { input: 'when' },
        operator: '$gt',
        value: { kind: 'now', offset: { amount: -3, unit: 'days' } },
      },
      {
        kind: 'check',
        target: { path: ['title'] },
        operator: '$null',
        value: { kind: 'fixed', value: false },
      },
      {
        kind: 'group',
        match: 'any',
        items: [
          {
            kind: 'check',
            target: { path: ['author', 'documentId'] },
            operator: '$eq',
            value: { kind: 'user', attribute: 'documentId' },
          },
          {
            kind: 'check',
            target: { path: ['views'] },
            operator: '$in',
            value: { kind: 'fixed', value: [1, 2] },
          },
        ],
      },
    ],
  },
  onSave: {
    stamp: [
      { field: 'author', value: { kind: 'user' } },
      { field: 'views', value: { kind: 'fixed', value: 0 } },
    ],
    locked: ['author'],
  },
};

const check = (path: string[], operator: string, value?: EntryCheck['value']): EntryCheck => ({
  kind: 'check',
  target: { path },
  operator,
  value,
});

const formWith = (items: EntryCheck[], rest: Partial<BuilderConditionV2> = {}): BuilderForm =>
  toForm({
    ...full,
    inputs: [],
    who: { match: 'all', checks: [] },
    onSave: { stamp: [], locked: [] },
    which: { kind: 'group', match: 'all', items },
    ...rest,
  });

describe('toForm and toCondition', () => {
  it('give back the same condition for a full example', () => {
    expect(toCondition(toForm(full))).toEqual(full);
  });

  it('give back the same condition for an upgraded version 1 file', () => {
    const upgraded = upgradeVersion1({
      slug: 'old-one',
      displayName: 'Old one',
      subjects: ['api::article.article'],
      query: {
        $and: [
          { title: { $contains: 'E2E' } },
          { author: { documentId: { $eq: '$user.documentId' } } },
          { createdAt: { $gt: '$now' } },
        ],
      },
    });

    expect(toCondition(toForm(upgraded))).toEqual(upgraded);
  });

  it('keeps a field input required, whatever a file or the form says', () => {
    const optional = {
      ...full,
      inputs: [{ name: 'when', kind: 'field' as const, accepts: 'date' as const, required: false }],
    };
    const form = toForm(optional);

    expect(form.inputs[0].required).toBe(true);
    expect(
      toCondition({ ...form, inputs: [{ ...form.inputs[0], required: false }] }).inputs
    ).toEqual([{ name: 'when', kind: 'field', accepts: 'date', required: true }]);
  });

  it('holds values as the text typed and gives each row its own key', () => {
    const form = toForm(full);
    const [views] = form.which.items.slice(1) as FormCheck[];
    const keys = form.which.items.map(({ key }) => key);

    expect(form.inputs[0].default).toBe('5');
    expect(views.value).toEqual({ kind: 'input', name: 'limit' });
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('starts an empty condition with no rows', () => {
    const form = toForm();

    expect(form.which.items).toEqual([]);
    expect(toCondition(form)).toMatchObject({
      version: 2,
      slug: '',
      which: { match: 'all', items: [] },
    });
  });
});

describe('formProblems', () => {
  it('finds nothing wrong with a sound condition', () => {
    expect(
      formProblems(
        toForm({ ...full, onSave: { stamp: [], locked: [] }, who: { match: 'all', checks: [] } }),
        layout
      )
    ).toEqual([]);
  });

  it('refuses negation across a to-many relation', () => {
    const form = formWith([check(['tags', 'name'], '$ne', { kind: 'fixed', value: 'x' })]);

    expect(formProblems(form, layout)).toEqual([
      {
        path: 'which.items.0.operator',
        message: "is not, does not include and none of can't cross the to-many relation tags",
      },
    ]);
  });

  it('checks a hop into the end user against the user attributes when the layout lists no end-user type', () => {
    const unlisted: BuilderLayout = {
      ...layout,
      contentTypes: layout.contentTypes.filter(({ uid }) => uid !== 'plugin::end-users.user'),
    };
    const eq = { kind: 'fixed', value: 'ada@example.com' } as const;

    expect(formProblems(formWith([check(['author', 'email'], '$eq', eq)]), unlisted)).toEqual([]);
    expect(formProblems(formWith([check(['author', 'nothing'], '$eq', eq)]), unlisted)).toEqual([
      expect.objectContaining({
        path: 'which.items.0.target.path',
        message: 'nothing is not a field of plugin::end-users.user',
      }),
    ]);
  });

  it('refuses a nested group with no check, and allows an empty root', () => {
    const form = toForm({
      ...full,
      who: { match: 'all', checks: [] },
      inputs: [],
      onSave: { stamp: [], locked: [] },
      which: { kind: 'group', match: 'all', items: [{ kind: 'group', match: 'any', items: [] }] },
    });

    expect(formProblems(form, layout)).toEqual([
      { path: 'which.items.0', message: 'A group needs at least one check' },
    ]);
    expect(formProblems(formWith([]), layout)).not.toContainEqual(
      expect.objectContaining({ path: 'which' })
    );
  });

  it('refuses a text default that starts like a placeholder', () => {
    const form = toForm({
      ...full,
      inputs: [{ name: 'label', kind: 'text', required: false, default: '$user.email' }],
    });

    expect(formProblems(form, layout).filter(({ path }) => path.startsWith('inputs'))).toEqual([
      expect.objectContaining({ path: 'inputs.0.default' }),
    ]);
  });

  it('refuses a locked field the chosen types do not share', () => {
    const form = toForm({
      ...full,
      appliesTo: { kind: 'types', types: ['api::article.article', 'api::page.page'] },
      onSave: { stamp: [], locked: ['title', 'views'] },
    });

    expect(formProblems(form, layout).filter(({ path }) => path.startsWith('onSave'))).toEqual([
      expect.objectContaining({
        path: 'onSave.locked.1',
        message: expect.stringContaining('views'),
      }),
    ]);
  });

  it('checks the slug as it is sent, trimmed', () => {
    const form = toForm({ ...full, slug: 'my-articles' });

    expect(formProblems({ ...form, slug: '  my-articles ' }, layout)).toEqual(
      formProblems(form, layout)
    );
  });

  it('refuses a bad date', () => {
    const form = formWith([check(['createdAt'], '$gt', { kind: 'fixed', value: 'tomorrow' })]);

    expect(formProblems(form, layout)).toEqual([
      expect.objectContaining({ path: 'which.items.0.value.value' }),
    ]);
    expect(formProblems(form, layout)[0].message).toContain(
      'createdAt: a date and time is written'
    );
  });

  it('refuses a path that is missing on a chosen type', () => {
    const form = formWith([check(['name'], '$eq', { kind: 'fixed', value: 'x' })], {
      appliesTo: { kind: 'types', types: ['api::article.article', 'api::page.page'] },
    });

    expect(formProblems(form, layout)).toEqual([
      { path: 'which.items.0.target.path', message: 'name is not a field of api::article.article' },
    ]);
  });

  it('refuses a field whose type differs between the chosen types', () => {
    const form = formWith([check(['views'], '$eq', { kind: 'fixed', value: 1 })], {
      appliesTo: { kind: 'types', types: ['api::article.article', 'api::page.page'] },
    });

    expect(formProblems(form, layout)[0].message).toContain(
      'views is a integer on api::article.article but a string on api::page.page'
    );
  });

  it('refuses what goes over the limits', () => {
    const many = Array.from({ length: 51 }, () =>
      check(['title'], '$eq', { kind: 'fixed', value: 'x' })
    );
    const deep = formWith([
      {
        kind: 'group',
        match: 'all',
        items: [{ kind: 'group', match: 'all', items: [] }],
      } as never,
    ]);
    const hops = formWith([
      check(['tags', 'tags', 'tags', 'name'], '$eq', { kind: 'fixed', value: 'x' }),
    ]);

    expect(formProblems(formWith(many), layout)).toEqual([
      { path: 'which.items.50', message: 'A condition can hold at most 50 checks' },
    ]);
    expect(formProblems(deep, layout)).toEqual([
      { path: 'which.items.0.items.0', message: 'Groups nest 1 level deep at most' },
    ]);
    expect(formProblems(hops, layout)[0].message).toContain('goes through more than 2 relations');
  });

  it('refuses an input of the wrong kind and an operator the type does not offer', () => {
    const wrongKind = formWith([check(['views'], '$gte', { kind: 'input', name: 'label' })], {
      inputs: [{ name: 'label', kind: 'text', required: true }],
    });
    const wrongOperator = formWith([check(['views'], '$contains', { kind: 'fixed', value: 'x' })]);

    expect(formProblems(wrongKind, layout)).toEqual([
      { path: 'which.items.0.value', message: 'views takes a number, not a text' },
    ]);
    expect(formProblems(wrongOperator, layout)[0]).toMatchObject({
      path: 'which.items.0.operator',
      message: expect.stringContaining('$contains is not offered for views'),
    });
  });

  it('names a number that is not one', () => {
    const form = formWith([check(['views'], '$eq', { kind: 'fixed', value: 1 })]);

    (form.which.items[0] as FormCheck).value = { kind: 'fixed', valueType: 'number', text: 'abc' };

    expect(formProblems(form, layout)[0]).toMatchObject({
      path: 'which.items.0.value.value',
      message: expect.stringContaining('takes a number'),
    });
  });

  it('refuses a Who role that does not exist and a slug that is reserved', () => {
    const form = toForm({
      ...full,
      slug: 'new',
      who: { match: 'all', checks: [{ kind: 'roles', match: 'any', roles: ['Nobody'] }] },
    });

    expect(formProblems(form, layout).map(({ path }) => path)).toEqual([
      'slug',
      'who.checks.0.roles',
    ]);
  });
});

describe('fieldsFor', () => {
  it('offers only what every chosen type has, with the same type', () => {
    const fields = fieldsFor(layout, {
      kind: 'types',
      types: ['api::article.article', 'api::page.page'],
    });

    expect(fields.map(({ name }) => name)).toEqual(['title', 'status', 'createdAt', 'tags']);
    expect(fields.find(({ name }) => name === 'status')?.enum).toEqual(['draft', 'live']);
    expect(fields.find(({ name }) => name === 'tags')?.type).toBe('relation');
  });

  it('offers everything of a single type and nothing for none', () => {
    expect(fieldsFor(layout, { kind: 'types', types: ['api::article.article'] })).toHaveLength(6);
    expect(fieldsFor(layout, { kind: 'types', types: [] })).toEqual([]);
    expect(fieldsFor(layout, { kind: 'user-relation' }).map(({ name }) => name)).toContain('views');
  });
});
