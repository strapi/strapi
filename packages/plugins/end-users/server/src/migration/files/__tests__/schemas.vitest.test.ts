import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import profile from '../../../content-types/profile';
import { planSchemaChanges, UP_STOCK_USER_ATTRIBUTES } from '../schemas';
import type { FilesPlan } from '../types';

const FIXTURES = path.join(__dirname, 'fixtures');
const UP_USER = 'src/extensions/users-permissions/content-types/user/schema.json';
const PROFILE = 'src/extensions/end-users/content-types/profile/schema.json';

const readProject = (name: string): Map<string, string> => {
  const root = path.join(FIXTURES, name);
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.set(
          path.relative(root, full).split(path.sep).join('/'),
          fs.readFileSync(full, 'utf8')
        );
      }
    }
  };

  walk(root);

  return files;
};

const apply = (files: ReadonlyMap<string, string>, plan: FilesPlan) => {
  const next = new Map(files);

  for (const change of plan.changes) {
    if (change.after === null) {
      next.delete(change.path);
    } else {
      next.set(change.path, change.after);
    }
  }

  return next;
};

const after = (plan: FilesPlan, file: string) => {
  const change = plan.changes.find((entry) => entry.path === file);

  return change?.after ? JSON.parse(change.after) : undefined;
};

describe('planSchemaChanges', () => {
  it('moves the custom attributes to a new profile extension that starts with the stock user', () => {
    const plan = planSchemaChanges(readProject('new-extension'));
    const extension = after(plan, PROFILE);

    expect(Object.keys(extension.attributes)).toEqual(['user', 'nickname', 'favoriteBooks']);
    expect(extension.attributes.user).toEqual(profile.schema.attributes.user);
    expect(extension.attributes.nickname).toEqual({ type: 'string', maxLength: 40 });
    expect(extension.info.singularName).toBe('profile');
    expect(plan.changes.find((entry) => entry.path === PROFILE)?.before).toBeNull();
    expect(plan.changes.find((entry) => entry.path === UP_USER)?.after).toBeNull();
    expect(plan.changes.find((entry) => entry.path === PROFILE)?.after).toMatch(/\n {2}"kind"/);
    expect(plan.findings).toEqual([]);
  });

  it('merges into an existing profile extension and reports a clash', () => {
    const files = readProject('existing-profile');
    const plan = planSchemaChanges(files);
    const extension = after(plan, PROFILE);

    expect(Object.keys(extension.attributes)).toEqual(['user', 'bio', 'nickname', 'age']);
    expect(extension.attributes.nickname).toEqual({ type: 'string' });
    expect(extension.attributes.user).toEqual(profile.schema.attributes.user);
    expect(plan.changes.find((entry) => entry.path === PROFILE)?.before).toBe(files.get(PROFILE));
    expect(plan.findings).toEqual([expect.objectContaining({ rule: 'profile-clash' })]);
    expect(plan.findings[0].message).toContain('nickname');
  });

  it('retargets the other side of a relation the user owned to the profile', () => {
    const plan = planSchemaChanges(readProject('new-extension'));
    const book = after(plan, 'src/api/book/content-types/book/schema.json');

    expect(book.attributes.fans).toEqual({
      type: 'relation',
      relation: 'manyToMany',
      target: 'plugin::end-users.profile',
      mappedBy: 'favoriteBooks',
    });
    expect(Object.keys(book.attributes)).toEqual(['title', 'fans']);
  });

  it('drops an inverse field on the user and removes inversedBy from its owning side', () => {
    const plan = planSchemaChanges(readProject('inverse'));
    const post = after(plan, 'src/api/post/content-types/post/schema.json');

    expect(post.attributes.author).toEqual({
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::end-users.user',
    });
    // Nothing was left to move, so the profile extension is the stock schema
    expect(Object.keys(after(plan, PROFILE).attributes)).toEqual(['user']);
    expect(plan.findings).toEqual([
      expect.objectContaining({ rule: 'inverse-dropped', path: UP_USER }),
    ]);
    expect(plan.findings[0].message).toContain('posts');
  });

  it('retargets app and component relations to the end user', () => {
    const plan = planSchemaChanges(readProject('app-and-components'));

    expect(plan.changes.map((entry) => entry.path).sort((a, b) => a.localeCompare(b))).toEqual([
      'src/api/article/content-types/article/schema.json',
      'src/components/shared/byline.json',
    ]);
    expect(
      after(plan, 'src/api/article/content-types/article/schema.json').attributes.reviewer.target
    ).toBe('plugin::end-users.user');

    const byline = after(plan, 'src/components/shared/byline.json');

    expect(byline.attributes.writer.target).toBe('plugin::end-users.user');
    expect(byline.attributes.note).toEqual({ type: 'string' });
    expect(plan.findings).toEqual([]);
  });

  it('reports a relation to the old role type and a strapi-server file without changing them', () => {
    const files = readProject('role-and-server');
    const plan = planSchemaChanges(files);

    expect(plan.changes).toEqual([]);
    expect(plan.findings).toEqual([
      expect.objectContaining({
        rule: 'strapi-server',
        path: 'src/extensions/users-permissions/strapi-server.js',
      }),
      expect.objectContaining({
        rule: 'role-relation',
        path: 'src/api/team/content-types/team/schema.json',
      }),
    ]);
  });

  it('changes nothing the second time it runs', () => {
    for (const name of ['new-extension', 'existing-profile', 'inverse', 'app-and-components']) {
      const files = readProject(name);
      const migrated = apply(files, planSchemaChanges(files));

      expect(planSchemaChanges(migrated).changes).toEqual([]);
    }
  });

  it('keeps the stock attributes of the old user out of the profile', () => {
    expect(UP_STOCK_USER_ATTRIBUTES).toContain('role');

    const plan = planSchemaChanges(readProject('new-extension'));

    for (const name of UP_STOCK_USER_ATTRIBUTES) {
      expect(after(plan, PROFILE).attributes).not.toHaveProperty(name);
    }
  });
});
