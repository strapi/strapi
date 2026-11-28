/**
 * `@strapi/tests-e2e/fixtures`: what a ui test imports. See "Writing a test" in the README.
 *
 * - `test`: Playwright's `test` with the worker's Strapi `server`, the page logged in as a
 *   `role`, database resets (`resetScope`), edition and features (`features`, `requires`) and
 *   seeding (`seed`, `seedPlan` + `seeded`, `unique`).
 * - `expect`: Playwright's `expect`.
 * - `ROLES`, `CREDENTIALS`: the role users every worker logs in before its snapshot.
 * - `logIn`, `accessToken`: an API login for a seeded admin user, and the bearer token of a
 *   storage state.
 */
export { test } from './seed';
export { expect } from '@playwright/test';
export { CREDENTIALS, GUIDED_TOUR_OFF, ROLES, accessToken, logIn } from './auth';

export type { AppOptions, AppWorkerFixtures, AuthOptions, ResetOptions, ResetScope } from './app';
export type { Credentials, Role } from './auth';
export type { SeedFixtures, SeedOptions, SeedWorkerFixtures, Seeded } from './seed';
export type {
  Edition,
  InstanceFeatures,
  Requirements,
  SeedPlan,
  SeedResult,
  Server,
} from '@strapi/tests-shared';
