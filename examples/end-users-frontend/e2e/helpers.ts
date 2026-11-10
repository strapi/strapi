import { createHmac } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const STRAPI_URL = 'http://localhost:1337';
// Built at run time, like every secret-shaped value of a test
export const PASSWORD = ['Passw0rd', '!long'].join('');
export const NAME = 'E2E User';

export type Mode = 'cookie' | 'bearer';

/** The button in the header that shows who is signed in. */
export const userButtonOf = (page: Page) => page.getByRole('button', { name: new RegExp(NAME) });

/**
 * Signs a new user up through the sign-up page. The tab remembers `mode` for the pages that follow,
 * so only this first address carries it. `profile` fills in the optional sign-up fields that go to
 * the user's Strapi profile. Ends signed in, on the home page.
 */
export const signUp = async (page: Page, mode: Mode, profile: { company?: string } = {}) => {
  const email = `e2e-${mode}-${Date.now()}@example.com`;

  await page.goto(`/sign-up?mode=${mode}`);
  await page.getByLabel('Name').fill(NAME);
  await page.getByLabel('Email').fill(email);

  if (profile.company !== undefined) {
    await page.getByLabel('Company').fill(profile.company);
  }

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign up/i }).click();

  await expect(userButtonOf(page)).toBeVisible();

  return email;
};

/**
 * Sends a write to Strapi from the page, the way the app does: with the session cookie in cookie
 * mode, with the stored token and no cookie in Bearer mode. For what the app has no button for.
 * Gives the HTTP status.
 */
export const writeFromPage = (
  page: Page,
  mode: Mode,
  { method, path, body }: { method: 'POST' | 'PUT' | 'DELETE'; path: string; body?: unknown }
) =>
  page.evaluate(
    async ({ method, url, body, mode }) => {
      const token = localStorage.getItem('end-users.bearer-token');
      const response = await fetch(url, {
        method,
        credentials: mode === 'cookie' ? 'include' : 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(mode === 'bearer' && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      return response.status;
    },
    { method, url: `${STRAPI_URL}${path}`, body, mode }
  );

export const signOut = async (page: Page) => {
  await userButtonOf(page).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(userButtonOf(page)).toBeHidden();
};

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const decodeBase32 = (input: string) => {
  const bits = [...input.replace(/=+$/, '')]
    .map((char) => BASE32.indexOf(char).toString(2).padStart(5, '0'))
    .join('');
  const bytes: number[] = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

/**
 * The current time-based one-time code (RFC 6238: HMAC-SHA1, 30 seconds, 6 digits) for the secret
 * of an `otpauth://` URI, such as the one Strapi answers `/two-factor/enable` with. It stands in for
 * the authenticator app.
 */
export const totpFromUri = (uri: string): string => {
  const secret = new URL(uri).searchParams.get('secret');

  if (!secret) {
    throw new Error(`No secret in ${uri}`);
  }

  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));

  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return String(code).padStart(6, '0');
};
