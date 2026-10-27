import { test as base, expect } from '@playwright/test';
import { piwiFixtures } from '@piwitests/reporter';

export const test = base.extend(piwiFixtures);
export { expect };
