import fs from 'node:fs';
import path from 'node:path';
import { createAuthRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { row } from '../utils/permissions';

const USER_UID = 'plugin::end-users.user';

const builderFile = (slug: string, displayName: string) => ({
  version: 2,
  slug,
  displayName,
  appliesTo: { kind: 'types', types: [USER_UID] },
  inputs: [],
  who: { match: 'all', checks: [] },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['emailVerified'] },
        operator: '$eq',
        value: { kind: 'fixed', value: true },
      },
    ],
  },
  onSave: { stamp: [], locked: [] },
});

/**
 * Changing and deleting a builder condition, over HTTP. A write ends in a restart, which the
 * harness stands in for, so the service goes on refusing writes after the first one: each case
 * that needs a write that goes through starts its own instance.
 */
describe('end-users: admin API, builder conditions', () => {
  const conditionsDir = path.join(
    path.dirname(process.env.ENV_PATH as string),
    'src',
    'end-users',
    'conditions'
  );
  const fileOf = (slug: string) => path.join(conditionsDir, `${slug}.json`);
  const readFile = (slug: string) => JSON.parse(fs.readFileSync(fileOf(slug), 'utf8'));

  let strapi;
  let rqAdmin;
  let reloadSpy: jest.SpyInstance;

  /** An instance whose registry holds `used`, which a role uses, and `spare`, which none does */
  const start = async () => {
    fs.mkdirSync(conditionsDir, { recursive: true });
    fs.writeFileSync(fileOf('used'), JSON.stringify(builderFile('used', 'Used')));
    fs.writeFileSync(fileOf('spare'), JSON.stringify(builderFile('spare', 'Spare')));

    strapi = await createEndUsersInstance();

    await strapi
      .plugin('end-users')
      .service('role')
      .create({
        name: 'Uses a condition',
        permissions: [row('plugin::end-users.user.find', null, {}, [{ name: 'api::used' }])],
      });

    // A write asks the server to restart, which the harness must not do
    reloadSpy = jest.spyOn(strapi, 'reload', 'get').mockReturnValue(
      Object.assign(jest.fn(), {
        isWatching: true,
        isReloading: false,
        resumeWatching: jest.fn(),
      }) as never
    );
    rqAdmin = await createAuthRequest({ strapi });
  };

  const stop = async () => {
    reloadSpy?.mockRestore();

    // The database outlives the instance, and the next one makes the same role
    await strapi?.db
      .query('plugin::end-users.permission')
      .deleteMany({ where: { role: { type: 'custom' } } });
    await strapi?.db.query('plugin::end-users.role').deleteMany({ where: { type: 'custom' } });
    await strapi?.destroy();
    strapi = undefined;
    fs.rmSync(conditionsDir, { recursive: true, force: true });
  };

  describe('a change, and a second write while the restart is waited for', () => {
    beforeAll(start);
    afterAll(stop);

    it('refuses to delete a condition a role uses, and leaves its file', async () => {
      const res = await rqAdmin.delete('/end-users/conditions/used');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('used by 1 role');
      expect(fs.existsSync(fileOf('used'))).toBe(true);
    });

    it('rewrites the file of a condition on a PUT', async () => {
      const res = await rqAdmin.put('/end-users/conditions/spare', {
        body: builderFile('spare', 'Spare, renamed'),
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'api::spare' });
      expect(readFile('spare').displayName).toBe('Spare, renamed');
    });

    it('answers 409 to the next write and changes nothing, until the server has restarted', async () => {
      const deleted = await rqAdmin.delete('/end-users/conditions/spare');
      const changed = await rqAdmin.put('/end-users/conditions/used', {
        body: builderFile('used', 'Used, renamed'),
      });

      for (const res of [deleted, changed]) {
        expect(res.status).toBe(409);
        expect(res.body.error.details.code).toBe('CONDITIONS_UPDATING');
      }

      expect(fs.existsSync(fileOf('spare'))).toBe(true);
      expect(readFile('used').displayName).toBe('Used');
    });
  });

  describe('a delete of a condition no role uses', () => {
    beforeAll(start);
    afterAll(stop);

    it('answers 200 and removes the file', async () => {
      const res = await rqAdmin.delete('/end-users/conditions/spare');

      expect(res.status).toBe(200);
      expect(fs.existsSync(fileOf('spare'))).toBe(false);
      expect(fs.existsSync(fileOf('used'))).toBe(true);
    });
  });
});
