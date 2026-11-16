import type { Server } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';
import { writeProbe } from './probe';

test.use({ resetScope: 'test', resetMode: 'reload' });

const bootId = async (server: Server) => {
  const res = await fetch(`${server.url}/api/tests/boot`);
  return ((await res.json()) as { bootId: string }).bootId;
};

let firstBootId: string | undefined;

test('with reload mode, a test starts on the snapshot', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
  firstBootId = await bootId(server);
});

test('with reload mode, the restore restarts the Strapi worker', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
  expect(await bootId(server)).not.toBe(firstBootId);
});
