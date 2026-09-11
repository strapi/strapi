/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

/**
 * Passkeys pins `@simplewebauthn/server` at exactly 14.0.1 and writes its marshalling against
 * three shapes the library enforces at runtime or in its types. Both verify functions are mocked
 * in the service unit tests -- deliberately, since what is under test there is our wiring, not
 * upstream cryptography -- so this file is the only place those shapes are checked against the
 * package that is actually installed. A minor bump that changed any of them would otherwise show
 * up as a 500 in production and nowhere in CI.
 */
const findPackageRoot = (from: string): string => {
  let dir = path.dirname(from);
  // The installed package is built with dnt (deno-to-node), which drops a bare
  // `{ "type": "commonjs" }` / `{ "type": "module" }` marker `package.json` inside each of its
  // `script/` and `esm/` output directories. `require.resolve('@simplewebauthn/server')` lands
  // inside `script/`, so the naive "nearest package.json" walk stops on that marker file --
  // which has no `name`/`version`/`exports` -- one directory short of the real manifest. Keep
  // walking until the manifest actually looks like the package (has a `name` and a `version`).
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
    // The `strapi-server` build is CJS, so `exports["."].require` and -- the trap this check
    // exists for -- `exports["./helpers"].require` must both be present and resolvable. A subpath
    // the CJS build cannot resolve fails at require time, not at build time.
    expect(MANIFEST.exports['.'].require).toBeDefined();
    expect(MANIFEST.exports['./helpers'].require).toBeDefined();
    expect(() => require.resolve('@simplewebauthn/server')).not.toThrow();
    // The `./helpers` subpath is exactly what this test verifies is resolvable;
    // eslint-plugin-node's static resolver does not evaluate the package's `exports` map and
    // reports a false positive here.
    // eslint-disable-next-line node/no-missing-require
    expect(() => require.resolve('@simplewebauthn/server/helpers')).not.toThrow();
    expect(typeof isoUint8Array.fromUTF8String).toBe('function');
    expect(typeof isoBase64URL.fromBuffer).toBe('function');
    expect(typeof isoBase64URL.toBuffer).toBe('function');
  });

  test("the engines range is inside Strapi's own", () => {
    // The package declares `node >= 20`, inside Strapi's `>=22 <=26`. If the installed manifest
    // phrases it differently, assert the real string rather than deleting the check: a floor
    // above 22 would put the library outside the Node range Strapi supports.
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
    // The whole justification for deriving the handle from the admin user id: a later
    // passwordless flow decodes it back with no stored column.
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
    // Anchored on `type WebAuthnCredential =` rather than a bare `WebAuthnCredential[^=]*=`: the
    // name is also *referenced* as a parameter/field type in verifyRegistrationResponse.d.ts and
    // verifyAuthenticationResponse.d.ts (e.g. `credential: WebAuthnCredential;`), with no `=`
    // anywhere nearby. An unanchored `[^=]*` gap is not bounded by file or declaration edges --
    // declarationText() concatenates every .d.ts in the package -- so it walks past those
    // references and past this type's own closing brace to latch onto the next unrelated
    // `SomethingElse = { ... }` declaration later in the concatenated text. Confirmed against the
    // installed 14.0.1: the unanchored version matched `VerifiedAuthenticationResponse`'s body
    // instead of `WebAuthnCredential`'s.
    const credential = declarations.match(/type WebAuthnCredential\s*=\s*\{[\s\S]*?\n\s*\}/);

    expect(credential).not.toBeNull();
    // The installed .d.ts spells the field `publicKey: Uint8Array_` -- a local alias
    // (`type Uint8Array_ = ReturnType<Uint8Array['slice']>`, i.e. functionally `Uint8Array`) that
    // exists only to dodge a lib.dom/lib.dom.iterable naming clash. The unanchored match below
    // still requires the literal substring `Uint8Array` to be present, so the trailing `_` does
    // not weaken this assertion.
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
