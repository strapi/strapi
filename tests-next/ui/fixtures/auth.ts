import fs from 'node:fs';
import path from 'node:path';

import { request, type WorkerInfo } from '@playwright/test';
import { seed, type Server } from '@strapi/tests-shared';

/**
 * The admin roles a ui test can start logged in as (RFC D5). Each one is an admin user with the
 * Strapi role of the same name: Super Admin, Editor, Author.
 */
export type Role = 'admin' | 'editor' | 'author';

export const ROLES: readonly Role[] = ['admin', 'editor', 'author'];

export interface Credentials {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  /** The code of the Strapi admin role the user gets. */
  roleCode: string;
}

/** Deterministic, created once per worker before the snapshot, so every reset keeps them. */
export const CREDENTIALS: Readonly<Record<Role, Readonly<Credentials>>> = {
  admin: {
    email: 'admin@tests.strapi.io',
    password: 'Admin-Tests-1',
    firstname: 'Admin',
    lastname: 'Tests',
    roleCode: 'strapi-super-admin',
  },
  editor: {
    email: 'editor@tests.strapi.io',
    password: 'Editor-Tests-1',
    firstname: 'Editor',
    lastname: 'Tests',
    roleCode: 'strapi-editor',
  },
  author: {
    email: 'author@tests.strapi.io',
    password: 'Author-Tests-1',
    firstname: 'Author',
    lastname: 'Tests',
    roleCode: 'strapi-author',
  },
};

/**
 * Where the storage state of a role is saved: under the project's output dir (`test-results`,
 * gitignored and emptied at the start of each run), one folder per project and server, since a
 * state only works against the server it logged in to.
 */
export const storageStatePath = (workerInfo: WorkerInfo, server: Server, role: Role) =>
  path.join(
    workerInfo.project.outputDir,
    '.auth',
    `${workerInfo.project.name}-${server.port}`,
    `${role}.json`
  );

/**
 * Log one role in through the admin API and save its storage state: the refresh cookie the login
 * sets, and the access token where the panel keeps it after a "Remember me" login (`jwtToken` in
 * localStorage, see packages/core/admin/admin/src/reducer.ts). A page that loads this state opens
 * the panel logged in.
 */
const saveStorageState = async (server: Server, role: Role, file: string) => {
  const { email, password } = CREDENTIALS[role];
  const context = await request.newContext({ baseURL: server.url });
  try {
    const res = await context.post('/admin/login', {
      data: { email, password, rememberMe: true },
    });
    if (!res.ok()) {
      throw new Error(`API login as ${role} failed (${res.status()}): ${await res.text()}`);
    }
    const { data } = (await res.json()) as { data: { token: string } };

    const state = await context.storageState();
    state.origins = [
      {
        origin: server.url,
        localStorage: [
          { name: 'jwtToken', value: JSON.stringify(data.token) },
          { name: 'isLoggedIn', value: 'true' },
        ],
      },
    ];
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } finally {
    await context.dispose();
  }
};

/**
 * Create the user of each role and save their storage states. Call it once per worker, after the
 * server starts and before `snapshotDatabase`: the users and their admin sessions are then part of
 * the snapshot, so they survive every reset.
 */
export const loginRoles = async (server: Server, workerInfo: WorkerInfo) => {
  await seed(server, {
    adminUsers: ROLES.map((role) => {
      const { email, password, firstname, lastname, roleCode } = CREDENTIALS[role];
      return { email, password, firstname, lastname, roles: [roleCode] };
    }),
  });
  await Promise.all(
    ROLES.map((role) => saveStorageState(server, role, storageStatePath(workerInfo, server, role)))
  );
};
