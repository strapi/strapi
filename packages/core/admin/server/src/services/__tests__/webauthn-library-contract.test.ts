/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

/** The service unit tests mock both verify functions, so this is the only place the library's
 * shapes meet the package actually installed. A minor bump would otherwise surface as a 500. */
const findPackageRoot = (from: string): string => {
  let dir = path.dirname(from);
  // The package is built with dnt, which drops a bare `{ "type": "commonjs" }` marker
  // `package.json` in its `script/` output. A "nearest package.json" walk stops on that marker, one
  // directory short of the real manifest, so keep walking until one has a `name` and a `version`.
  for (;;) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as {
        name?: string;
        version?: string;
      };
      if (parsed.name && parsed.version) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No package.json above ${from}`);
    dir = parent;
  }
};

const PACKAGE_ROOT = findPackageRoot(require.resolve('@simplewebauthn/server'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
  version: string;
  license?: string;
  exports: Record<string, { require?: string; import?: string }>;
};

const declarationText = (): string => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(entryPath);
      return entry.name.endsWith('.d.ts') ? [entryPath] : [];
    });

  const files = walk(PACKAGE_ROOT);
  expect(files.length).toBeGreaterThan(0);
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
};

describe('@simplewebauthn/server call contract', () => {
  test('the pinned version is what is installed, under a permissive licence', () => {
    expect(MANIFEST.version).toBe('14.0.1');
    expect(MANIFEST.license).toBe('MIT');
  });

  test('the CJS build resolves the root and the ./helpers subpath', () => {
    // The `strapi-server` build is CJS, and a subpath it cannot resolve fails at require time, not
    // at build time. `./helpers` is the trap.
    expect(MANIFEST.exports['.'].require).toBeDefined();
    expect(MANIFEST.exports['./helpers'].require).toBeDefined();
    expect(() => require.resolve('@simplewebauthn/server')).not.toThrow();
    // eslint-plugin-node's resolver does not evaluate `exports`, so this is a false positive.
    // eslint-disable-next-line node/no-missing-require
    expect(() => require.resolve('@simplewebauthn/server/helpers')).not.toThrow();
    expect(typeof isoUint8Array.fromUTF8String).toBe('function');
    expect(typeof isoBase64URL.fromBuffer).toBe('function');
    expect(typeof isoBase64URL.toBuffer).toBe('function');
  });

  test("the engines range is inside Strapi's own", () => {
    // If the manifest phrases this differently, assert the real string rather than delete the check:
    // a floor above 22 puts the library outside the Node range Strapi supports.
    expect(MANIFEST).toHaveProperty('engines');
    expect((MANIFEST as { engines?: { node?: string } }).engines?.node).toMatch(/20/);
  });

  test('shape 1: userID must be a Uint8Array -- a string throws', async () => {
    await expect(
      generateRegistrationOptions({
        rpName: 'Strapi',
        rpID: 'example.com',
        userName: 'kai@doe.com',
        // @ts-expect-error - deliberately the wrong type: the throw is the contract under test.
        userID: '7',
      })
    ).rejects.toThrow();
  });

  test('a Uint8Array userID becomes a user handle we can decode straight back to the id', async () => {
    const options = await generateRegistrationOptions({
      rpName: 'Strapi',
      rpID: 'example.com',
      userName: 'kai@doe.com',
      userID: isoUint8Array.fromUTF8String('7'),
    });

    expect(typeof options.challenge).toBe('string');
    // Why the handle is derived from the admin user id: a later passwordless flow decodes it back.
    expect(Buffer.from(isoBase64URL.toBuffer(options.user.id)).toString('utf8')).toBe('7');
  });

  test('isoBase64URL round-trips a COSE-key-shaped buffer without padding or +/', () => {
    const key = new Uint8Array([1, 2, 3, 250, 251, 252]);
    const encoded = isoBase64URL.fromBuffer(key);

    expect(encoded).not.toMatch(/[+/=]/);
    expect(Array.from(isoBase64URL.toBuffer(encoded))).toEqual(Array.from(key));
  });

  test('shapes 2 and 3: a stored credential is { publicKey: Uint8Array; counter: number }', () => {
    const declarations = declarationText();
    // Anchored on `type WebAuthnCredential =`, because the name is also referenced as a field type
    // elsewhere with no `=` nearby -- and `declarationText()` concatenates every .d.ts, so an
    // unanchored gap walks past this type's closing brace onto an unrelated declaration. Against the
    // installed 14.0.1 it matched `VerifiedAuthenticationResponse`'s body instead.
    const credential = declarations.match(/type WebAuthnCredential\s*=\s*\{[\s\S]*?\n\s*\}/);

    expect(credential).not.toBeNull();
    // The installed .d.ts spells this `publicKey: Uint8Array_`, a local alias dodging a lib.dom
    // naming clash. The match still requires the literal `Uint8Array`, so the `_` costs nothing.
    expect(credential![0]).toMatch(/publicKey\s*:\s*Uint8Array/);
    expect(credential![0]).toMatch(/counter\s*:\s*number/);
    expect(credential![0]).toMatch(/id\s*:\s*(Base64URLString|string)/);
  });

  test('the four functions this module calls are exported from the root', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const root = require('@simplewebauthn/server');

    for (const name of [
      'generateRegistrationOptions',
      'verifyRegistrationResponse',
      'generateAuthenticationOptions',
      'verifyAuthenticationResponse',
    ]) {
      expect(typeof root[name]).toBe('function');
    }
  });
});
