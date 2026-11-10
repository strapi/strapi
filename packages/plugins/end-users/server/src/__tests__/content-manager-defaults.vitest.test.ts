import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import {
  USER_EDIT_LAYOUT_OMITTED,
  labelOf,
  writeContentManagerDefaults,
} from '../content-manager-defaults';
import { PROFILE_UID, USER_UID } from '../constants';

const setup = () => {
  const stores: Record<string, Record<string, unknown>> = {};
  const strapi = {
    store: ({ name }: { name: string }) => ({
      get: async ({ key }: { key: string }) => stores[name]?.[key] ?? null,
      async set({ key, value }: { key: string; value: unknown }) {
        stores[name] = { ...stores[name], [key]: value };
      },
    }),
  } as unknown as Core.Strapi;

  return { strapi, stores };
};

const KEY = (uid: string) => `configuration_content_types::${uid}`;
const meta = (name: string) => ({ edit: { label: name }, list: { label: name } });
const names = [
  'name',
  'email',
  'emailVerified',
  'displayUsername',
  'roles',
  'banned',
  'banReason',
  'banExpires',
  'twoFactorEnabled',
  'failedSignIns',
  'lockedUntil',
  'lastSignInAt',
  'preferredLocale',
];
const configuration = (attributes: string[]) => ({
  uid: USER_UID,
  metadatas: Object.fromEntries([...attributes, 'id'].map((name) => [name, meta(name)])),
  layouts: { list: [], edit: [attributes.map((name) => ({ name, size: 6 }))] },
});

describe('the default Content Manager configuration', () => {
  it('writes sentence case labels instead of attribute names', () => {
    expect(labelOf('emailVerified')).toBe('Email verified');
    expect(labelOf('twoFactorEnabled')).toBe('Two-factor enabled');
    expect(labelOf('lastSignInAt')).toBe('Last sign-in');
    expect(labelOf('fullName')).toBe('Full name');
    expect(labelOf('nick_name')).toBe('Nick name');
  });

  it('labels the user type, keeps a label an administrator changed, and leaves id alone', async () => {
    const { strapi, stores } = setup();
    const written = configuration(names);

    written.metadatas.email.edit.label = 'Login address';
    stores.content_manager = { [KEY(USER_UID)]: written };

    await writeContentManagerDefaults(strapi);

    const { metadatas } = stores.content_manager[KEY(USER_UID)] as ReturnType<typeof configuration>;

    expect(metadatas.emailVerified).toEqual({
      edit: { label: 'Email verified' },
      list: { label: 'Email verified' },
    });
    expect(metadatas.email.edit.label).toBe('Login address');
    expect(metadatas.email.list.label).toBe('Email');
    expect(metadatas.id.list.label).toBe('id');
  });

  it('leaves the fields the Security panel acts on out of the edit layout, and puts the last sign-in last', async () => {
    const { strapi, stores } = setup();

    stores.content_manager = { [KEY(USER_UID)]: configuration(names) };

    await writeContentManagerDefaults(strapi);

    const { layouts } = stores.content_manager[KEY(USER_UID)] as {
      layouts: { edit: { name: string; size: number }[][] };
    };
    const shown = layouts.edit.flat().map(({ name }) => name);

    for (const name of USER_EDIT_LAYOUT_OMITTED) {
      expect(shown).not.toContain(name);
    }

    expect(shown[shown.length - 1]).toBe('lastSignInAt');
    expect(shown.slice(0, 3)).toEqual(['name', 'email', 'emailVerified']);
    expect(shown).toHaveLength(names.length - USER_EDIT_LAYOUT_OMITTED.length);
  });

  it('labels the profile and leaves its layout as it is', async () => {
    const { strapi, stores } = setup();
    const profile = { ...configuration(['user', 'favoriteColor']), uid: PROFILE_UID };

    stores.content_manager = { [KEY(PROFILE_UID)]: profile };

    await writeContentManagerDefaults(strapi);

    const written = stores.content_manager[KEY(PROFILE_UID)] as typeof profile;

    expect(written.metadatas.favoriteColor.edit.label).toBe('Favorite color');
    expect(written.layouts).toEqual(profile.layouts);
  });

  it('writes once and leaves an edited configuration alone', async () => {
    const { strapi, stores } = setup();

    stores.content_manager = { [KEY(USER_UID)]: configuration(names) };
    await writeContentManagerDefaults(strapi);

    const edited = { ...configuration(names), layouts: { list: ['email'], edit: [] } };

    stores.content_manager[KEY(USER_UID)] = edited;
    await writeContentManagerDefaults(strapi);

    expect(stores.content_manager[KEY(USER_UID)]).toBe(edited);
  });

  it('writes nothing, and records nothing, before the Content Manager has made the configuration', async () => {
    const { strapi, stores } = setup();

    await writeContentManagerDefaults(strapi);

    expect(stores).toEqual({});
  });
});
