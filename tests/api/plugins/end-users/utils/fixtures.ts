import type { Core } from '@strapi/types';
import { createTestBuilder } from 'api-tests/builder';

import { createEndUsersInstance } from './create-end-users-instance';
import type { CreateEndUsersInstanceOptions } from './create-end-users-instance';
import { TEST_ORIGIN } from './permissions';

export const USER_UID = 'plugin::end-users.user';
export const NOTE_UID = 'api::note.note';
export const FOLDER_UID = 'api::folder.folder';
export const ARTICLE_UID = 'api::article.article';
export const TAG_UID = 'api::tag.tag';
export const ORGANIZATION_UID = 'api::organization.organization';
export const SEO_COMPONENT_UID = 'shared.seo';

/** `shared.seo` */
export const seoComponent = {
  displayName: 'seo',
  category: 'shared',
  attributes: {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'text' },
  },
};

/** `api::tag.tag`, with draft & publish */
export const tagModel = {
  kind: 'collectionType',
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

/**
 * `api::organization.organization`: what an article and a profile (see `extendProfile`) can point
 * at, for the `$profile.<relation>.documentId` placeholder
 */
export const organizationModel = {
  kind: 'collectionType',
  singularName: 'organization',
  pluralName: 'organizations',
  displayName: 'Organization',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

/** `api::folder.folder`. Its `notes` is the other side of a note's `folder`. */
export const folderModel = {
  kind: 'collectionType',
  singularName: 'folder',
  pluralName: 'folders',
  displayName: 'Folder',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

/**
 * `api::note.note`: `owner` is a one-way relation to the end user (what `is-owner` reads), `folder`
 * a manyToOne whose other side is the folder's `notes`.
 */
export const noteModel = {
  kind: 'collectionType',
  singularName: 'note',
  pluralName: 'notes',
  displayName: 'Note',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string', required: true },
    body: { type: 'text' },
    secret: { type: 'string' },
    shared: { type: 'boolean', default: false },
    owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
    folder: {
      type: 'relation',
      relation: 'manyToOne',
      target: FOLDER_UID,
      targetAttribute: 'notes',
    },
  },
};

/**
 * `api::article.article`, with draft & publish: `author` is a one-way relation to the end user and
 * `tags` a one-way many relation to the tag type, which has draft & publish too.
 */
export const articleModel = {
  kind: 'collectionType',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string', required: true },
    body: { type: 'text' },
    internalNotes: { type: 'text' },
    seo: { type: 'component', repeatable: false, component: SEO_COMPONENT_UID },
    author: { type: 'relation', relation: 'oneToOne', target: USER_UID },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
    organization: { type: 'relation', relation: 'oneToOne', target: ORGANIZATION_UID },
  },
};

/**
 * A test builder with the fixture types: the component, then the content types in one batch,
 * each after the types it points at (the Content-Type Builder looks a relation's target up as it
 * creates the relation). Pass it to `createEndUsersInstance({ builder })`, which builds it with the
 * plugin enabled; or use `createFixturesInstance`.
 */
export const createFixtureBuilder = () =>
  createTestBuilder()
    .addComponent(seoComponent)
    .addContentTypes([tagModel, organizationModel, folderModel, noteModel, articleModel]);

/**
 * An end-users instance with the fixture types, which trusts `TEST_ORIGIN` (what
 * `createSignedInUser` signs up from). `strapi.destroy()` removes the types again.
 */
export const createFixturesInstance = (
  opts: CreateEndUsersInstanceOptions = {}
): Promise<Core.Strapi> =>
  createEndUsersInstance({
    ...opts,
    pluginConfig: { trustedOrigins: [TEST_ORIGIN], ...opts.pluginConfig },
    builder: opts.builder ?? createFixtureBuilder(),
  });

export interface SeedOptions {
  /** The `documentId`s of the users who own the notes */
  users: string[];
  /** How many folders */
  folders: number;
  /** How many notes */
  notes: number;
  /** The same seed and the same users give the same titles, owners, folders and flags */
  seed: number;
}

export interface SeededFolder {
  documentId: string;
  name: string;
}

export interface SeededNote {
  documentId: string;
  title: string;
  body: string;
  secret: string;
  shared: boolean;
  /** The owner's `documentId` */
  owner: string;
  /** The folder's `documentId` */
  folder: string;
}

export interface SeedResult {
  folders: SeededFolder[];
  notes: SeededNote[];
}

/** A small seeded generator (mulberry32): numbers in [0, 1), the same for the same seed. */
const randomFrom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Title words: several notes share each one, across owners, so prefix filters match several. */
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];

/**
 * Creates `folders` folders and `notes` notes, each note owned by one of `users` and put in one of
 * the folders, both picked by a generator seeded with `seed`. Titles are `<word> <n>` (a word
 * several notes share, then the note's number), so they are unique and a `$startsWith` on a word
 * matches notes of several owners. Every write goes through the Document Service, in one
 * transaction. Nothing is emptied first.
 */
export const seedNotes = async (
  strapi: Core.Strapi,
  { users, folders, notes, seed }: SeedOptions
): Promise<SeedResult> => {
  if (users.length === 0 || folders < 1) {
    throw new Error('seedNotes: needs at least one user and one folder');
  }

  const next = randomFrom(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)];

  return strapi.db.transaction(async () => {
    const seededFolders: SeededFolder[] = [];

    for (let index = 1; index <= folders; index += 1) {
      const name = `Folder ${index}`;
      // eslint-disable-next-line no-await-in-loop
      const { documentId } = await strapi.documents(FOLDER_UID as any).create({ data: { name } });

      seededFolders.push({ documentId, name });
    }

    const seededNotes: SeededNote[] = [];

    for (let index = 1; index <= notes; index += 1) {
      const owner = pick(users);
      const folder = pick(seededFolders).documentId;
      const title = `${pick(WORDS)} ${index}`;
      const shared = next() < 0.25;
      const body = `Body of ${title}`;
      const secret = `secret ${index}`;

      // eslint-disable-next-line no-await-in-loop
      const { documentId } = await strapi.documents(NOTE_UID as any).create({
        data: {
          title,
          body,
          secret,
          shared,
          owner: { connect: [{ documentId: owner }] },
          folder: { connect: [{ documentId: folder }] },
        } as any,
      });

      seededNotes.push({ documentId, title, body, secret, shared, owner, folder });
    }

    return { folders: seededFolders, notes: seededNotes };
  });
};
