import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATUS_CODES } from 'node:http';
import { camelCase } from 'lodash/fp';
import ts from 'typescript';
import createKoaApp from '../koa';
import type {
  ContextDelegatedResponseErrorMethods,
  ContextDelegatedResponseSuccessMethods,
} from '../koa-methods';

/**
 * The error helpers are generated at runtime from `node:http`'s `STATUS_CODES`
 * (see `koa.ts`) but the matching types are hand-maintained in `koa-methods.ts`.
 * These tests guard against the two drifting apart — e.g. if Node adds a new
 * 4xx/5xx status name the runtime would expose a helper the types don't declare.
 *
 * Rather than re-list the members, we read them straight from the interface
 * source with the TypeScript compiler API, so the type stays the single source
 * of truth.
 */

const KOA_METHODS_PATH = join(__dirname, '..', 'koa-methods.ts');

/** Extract the member names declared on a given interface in a .ts source file. */
const getInterfaceMemberNames = <T>(filePath: string, interfaceName: string): (keyof T)[] => {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true
  );

  const names: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (
          (ts.isMethodSignature(member) || ts.isPropertySignature(member)) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          names.push(member.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);

  if (names.length === 0) {
    throw new Error(`Interface "${interfaceName}" not found (or empty) in ${filePath}`);
  }

  return names as (keyof T)[];
};

const errorMethodNames = getInterfaceMemberNames<ContextDelegatedResponseErrorMethods>(
  KOA_METHODS_PATH,
  'ContextDelegatedResponseErrorMethods'
);
const successMethodNames = getInterfaceMemberNames<ContextDelegatedResponseSuccessMethods>(
  KOA_METHODS_PATH,
  'ContextDelegatedResponseSuccessMethods'
);
const allMethodNames = [...errorMethodNames, ...successMethodNames];

// Mirror of koa.ts: the camelCased names the runtime loop actually generates.
const runtimeErrorMethodNames = Object.entries(STATUS_CODES)
  .filter(([codeStr, name]) => Boolean(name) && Number(codeStr) >= 400 && Number(codeStr) < 600)
  .map(([, name]) => camelCase(name as string));

describe('koa custom response methods', () => {
  describe('type/runtime sync', () => {
    it('declares a type for every error helper the runtime generates (and vice-versa)', () => {
      expect(runtimeErrorMethodNames.toSorted()).toEqual(errorMethodNames.toSorted());
    });
  });

  describe('createKoaApp registration', () => {
    const app = createKoaApp({ proxy: false, keys: ['test'] });

    it.each(allMethodNames)('registers "%s" on ctx.response', (name) => {
      expect(typeof app.response[name]).toBe('function');
    });

    it.each(allMethodNames)('delegates "%s" onto ctx', (name) => {
      expect(typeof app.context[name]).toBe('function');
    });
  });

  describe('error helper behaviour', () => {
    const app = createKoaApp({ proxy: false, keys: ['test'] });

    it('sets status and formatted body from the http error', () => {
      const ctx: { status?: number; body?: unknown } = { status: 200 };
      app.response.notFound.call(ctx, 'nope');

      expect(ctx.status).toBe(404);
      expect(ctx.body).toMatchObject({
        error: { status: 404, name: 'NotFoundError', message: 'nope' },
      });
    });
  });

  describe('success helper behaviour', () => {
    const app = createKoaApp({ proxy: false, keys: ['test'] });

    it('send sets the given status and body', () => {
      const ctx: { status?: number; body?: unknown } = {};
      app.response.send.call(ctx, { ok: true }, 202);

      expect(ctx.status).toBe(202);
      expect(ctx.body).toEqual({ ok: true });
    });

    it('created sets status 201', () => {
      const ctx: { status?: number; body?: unknown } = {};
      app.response.created.call(ctx, { id: 1 });

      expect(ctx.status).toBe(201);
      expect(ctx.body).toEqual({ id: 1 });
    });

    it('deleted sets status 204 with no body and 200 with a body', () => {
      const emptyCtx: { status?: number; body?: unknown } = {};
      app.response.deleted.call(emptyCtx);
      expect(emptyCtx.status).toBe(204);
      expect(emptyCtx.body).toBeUndefined();

      const bodyCtx: { status?: number; body?: unknown } = {};
      app.response.deleted.call(bodyCtx, { id: 1 });
      expect(bodyCtx.status).toBe(200);
      expect(bodyCtx.body).toEqual({ id: 1 });
    });
  });
});
