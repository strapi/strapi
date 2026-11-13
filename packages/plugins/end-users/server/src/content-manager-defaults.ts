import type { Core } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID, USER_UID } from './constants';

/**
 * What the Content Manager shows for the user and profile types before an administrator has
 * configured them: human labels instead of the attribute names (`emailVerified`, `lockedUntil`), and
 * an edit layout that groups the account fields.
 *
 * The edit layout leaves out the fields the Security panel acts on (`banned`, `banReason`,
 * `banExpires`, `twoFactorEnabled`, `failedSignIns`, `lockedUntil`): two ways to ban one user, with
 * different validation, is confusing. They stay available through "Configure the view". This is the
 * one place to change that.
 */
export const USER_EDIT_LAYOUT_OMITTED: readonly string[] = [
  'banned',
  'banReason',
  'banExpires',
  'twoFactorEnabled',
  'failedSignIns',
  'lockedUntil',
];

/** The groups of the user's edit layout, in order; each starts a row. What is not named follows. */
const USER_EDIT_LAYOUT_GROUPS: readonly (readonly string[])[] = [
  ['name', 'email', 'emailVerified'],
  ['username', 'displayUsername', 'image'],
  ['roles', 'preferredLocale'],
];

/** Last, as the one field that only the system writes */
const USER_EDIT_LAYOUT_LAST: readonly string[] = ['lastSignInAt'];

const LABELS: Record<string, string> = {
  twoFactorEnabled: 'Two-factor enabled',
  lastSignInAt: 'Last sign-in',
  failedSignIns: 'Failed sign-ins',
  emailVerified: 'Email verified',
  displayUsername: 'Display username',
  preferredLocale: 'Preferred locale',
  banReason: 'Ban reason',
  banExpires: 'Ban expires',
  lockedUntil: 'Locked until',
};

/** `emailVerified` is "Email verified": sentence case, as the admin writes its own labels */
export const labelOf = (name: string): string => {
  if (LABELS[name]) {
    return LABELS[name];
  }

  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

type Metadata = { edit?: { label?: string }; list?: { label?: string } };
type EditCell = { name: string; size: number };
type Configuration = {
  metadatas?: Record<string, Metadata>;
  layouts?: { list?: string[]; edit?: EditCell[][] };
};

const MAX_ROW_SIZE = 12;

/** Packs the cells into rows of at most 12, each group starting a new row */
const toRows = (groups: EditCell[][]): EditCell[][] => {
  const rows: EditCell[][] = [];

  for (const group of groups) {
    let row: EditCell[] = [];
    let used = 0;

    for (const cell of group) {
      if (used + cell.size > MAX_ROW_SIZE) {
        rows.push(row);
        row = [];
        used = 0;
      }

      row.push(cell);
      used += cell.size;
    }

    if (row.length > 0) {
      rows.push(row);
    }
  }

  return rows;
};

const toEditLayout = (current: EditCell[][]): EditCell[][] => {
  const cells = new Map(current.flat().map((cell) => [cell.name, cell]));
  const omitted = new Set(USER_EDIT_LAYOUT_OMITTED);
  const named = new Set([...USER_EDIT_LAYOUT_GROUPS.flat(), ...USER_EDIT_LAYOUT_LAST]);

  const pick = (names: readonly string[]) =>
    names.filter((name) => cells.has(name) && !omitted.has(name)).map((name) => cells.get(name)!);

  const others = [...cells.keys()]
    .filter((name) => !named.has(name) && !omitted.has(name))
    .map((name) => cells.get(name)!);

  return toRows([...USER_EDIT_LAYOUT_GROUPS.map(pick), others, pick(USER_EDIT_LAYOUT_LAST)]);
};

const withLabels = (metadatas: Record<string, Metadata>): Record<string, Metadata> =>
  Object.fromEntries(
    Object.entries(metadatas).map(([name, metadata]) => {
      // Not attributes of the schema: the Content Manager's own columns
      if (name === 'id' || name === 'documentId') {
        return [name, metadata];
      }

      // A label an administrator already changed is theirs: only the default (the attribute name) is replaced
      const edit =
        metadata.edit?.label === name ? { ...metadata.edit, label: labelOf(name) } : metadata.edit;
      const list =
        metadata.list?.label === name ? { ...metadata.list, label: labelOf(name) } : metadata.list;

      return [name, { ...metadata, edit, list }];
    })
  );

type Attributes = Record<string, { type?: string }>;

/**
 * Whether the stored edit layout is still the one the Content Manager generates: the attributes in
 * schema order, packed into rows of 12 by the size of each field. Anything else was arranged by an
 * administrator and is left alone. A project that removed fields and changed nothing else looks
 * generated; that costs it nothing, the fields it hid stay hidden.
 */
const isGeneratedLayout = (strapi: Core.Strapi, uid: string, edit: EditCell[][]): boolean => {
  const attributes = (
    strapi.contentTypes as unknown as Record<string, { attributes?: Attributes }> | undefined
  )?.[uid]?.attributes;

  if (!attributes) {
    return false;
  }

  const names = edit.flat().map(({ name }) => name);
  const inSchemaOrder = Object.keys(attributes).filter((name) => names.includes(name));

  if (names.join() !== inSchemaOrder.join()) {
    return false;
  }

  const sizes = (
    strapi.plugin?.('content-manager')?.service?.('field-sizes') as
      { getFieldSize: (type: string) => { default: number } } | undefined
  )?.getFieldSize;

  const expected: EditCell[][] = [[]];
  let used = 0;

  for (const name of names) {
    const size = sizes ? sizes(attributes[name].type ?? 'string').default : undefined;
    const cell = edit.flat().find((each) => each.name === name)!;
    const width = size ?? cell.size;

    if (size !== undefined && cell.size !== size) {
      return false;
    }

    if (used + width > MAX_ROW_SIZE) {
      expected.push([]);
      used = 0;
    }

    expected[expected.length - 1].push(cell);
    used += width;
  }

  return (
    JSON.stringify(expected.map((row) => row.map(({ name }) => name))) ===
    JSON.stringify(edit.map((row) => row.map(({ name }) => name)))
  );
};

const writeDefaults = async (strapi: Core.Strapi, uid: string, withLayout: boolean) => {
  const own = strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const flag = `contentManagerDefaults::${uid}`;

  if (await own.get({ key: flag })) {
    return false;
  }

  const manager = strapi.store({ type: 'plugin', name: 'content_manager' });
  const key = `configuration_content_types::${uid}`;
  const configuration = (await manager.get({ key })) as Configuration | null;

  // The Content Manager makes the configuration when it starts; where there is none yet, the next start does this
  if (!configuration) {
    return false;
  }

  // An edit layout an administrator arranged is theirs: the labels are written, the layout is not
  const layouts =
    withLayout && isGeneratedLayout(strapi, uid, configuration.layouts?.edit ?? [])
      ? { ...configuration.layouts, edit: toEditLayout(configuration.layouts?.edit ?? []) }
      : configuration.layouts;

  await manager.set({
    key,
    value: { ...configuration, metadatas: withLabels(configuration.metadatas ?? {}), layouts },
  });
  await own.set({ key: flag, value: true });

  return true;
};

/**
 * Writes the default Content Manager configuration of the user and profile types, once each. Once
 * written it is the administrator's, and a later start does not put it back.
 */
export const writeContentManagerDefaults = async (strapi: Core.Strapi): Promise<void> => {
  await writeDefaults(strapi, USER_UID, true);
  await writeDefaults(strapi, PROFILE_UID, false);
};
