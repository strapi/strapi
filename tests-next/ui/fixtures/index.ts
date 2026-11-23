/**
 * `@strapi/tests-e2e/fixtures`: what a ui test imports. See "Writing a test" in the README.
 *
 * - `test`: Playwright's `test` with the worker's Strapi `server`, database resets
 *   (`resetScope`), edition and features (`features`, `requires`) and seeding (`seed`,
 *   `seedPlan` + `seeded`, `unique`).
 * - `expect`: Playwright's `expect`.
 */
export { test } from './seed';
export { expect } from '@playwright/test';

export type { AppOptions, AppWorkerFixtures, ResetOptions, ResetScope } from './app';
export type { SeedFixtures, SeedOptions, SeedWorkerFixtures, Seeded } from './seed';
export type {
  Edition,
  InstanceFeatures,
  Requirements,
  SeedPlan,
  SeedResult,
  Server,
} from '@strapi/tests-shared';
