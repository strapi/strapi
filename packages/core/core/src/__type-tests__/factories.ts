/**
 * Type-level regression tests for the real `factories.createCoreController`, compiled by
 * `yarn test:ts` (tsc -p tsconfig.json) and excluded from the build. Each call must compile.
 */
import type { Context } from 'koa';
import { createCoreController, createCoreService } from '../factories';

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// No content type is added to the registry here: a module augmentation would apply to the whole
// package program. The registered-type cases live in @strapi/types
// (src/core/__tests__/policy-controller.test.ts).

// A controller type passed explicitly, without the generic actions of `Extendable`.
type CustomController = { custom(ctx: Context): Promise<unknown> };

// No type arguments: custom actions call the base helpers,
// the core actions and any other action on `this`.
export const inferred = createCoreController('api::book.book', ({ strapi }) => ({
  async latest(ctx: Context) {
    strapi.log.info('latest');
    await this.find(ctx, async () => {});
    await this.other(ctx, async () => {});
    return this.transformResponse(await this.sanitizeOutput(await this.sanitizeQuery(ctx), ctx));
  },
}));

// No type arguments, object config.
export const inferredObject = createCoreController('api::book.book', {
  async latest(ctx: Context) {
    return this.transformResponse(await this.sanitizeQuery(ctx));
  },
});

// No config at all.
export const bare = createCoreController('api::book.book');

// Explicit type arguments: `this` exposes the core actions, the declared custom actions and
// any other action, as `Extendable` does.
export const explicit = createCoreController<'api::book.book', CustomController>(
  'api::book.book',
  () => ({
    async custom(ctx) {
      await this.find(ctx, async () => {});
      await this.other(ctx, async () => {});
      return this.transformResponse(await this.sanitizeQuery(ctx));
    },
  })
);

// An action that returns a value computed from `this` keeps the factory's inferred actions: `this`
// does not fix the inferred controller to its constraint (CMS-2624). The core action override and
// the object config take the same path.
const returnsThis = createCoreController('api::book.book', ({ strapi }) => ({
  async ping(): Promise<'pong'> {
    return 'pong';
  },
  async latest(ctx) {
    strapi.log.info('latest');
    return this.transformResponse(await this.sanitizeOutput([], ctx));
  },
  async find(ctx) {
    return this.transformResponse(await this.sanitizeQuery(ctx));
  },
}));
const returnsThisObject = createCoreController('api::book.book', {
  async ping(): Promise<'pong'> {
    return 'pong';
  },
  async latest(ctx) {
    return this.transformResponse(await this.sanitizeQuery(ctx));
  },
});
type ReturnsThis = ReturnType<typeof returnsThis>;
type ReturnsThisObject = ReturnType<typeof returnsThisObject>;

// The same for a core service: a method that returns a value computed from `this` keeps the others.
const serviceReturnsThis = createCoreService('api::book.book', {
  async ping(): Promise<'pong'> {
    return 'pong';
  },
  async latest() {
    return this.ping();
  },
});
type ServiceReturnsThis = ReturnType<typeof serviceReturnsThis>;

export type ReturnsThisChecks = [
  Expect<Equal<ReturnType<ReturnsThis['ping']>, Promise<'pong'>>>,
  Expect<Equal<ReturnType<ReturnsThis['latest']>, Promise<unknown>>>,
  Expect<Equal<ReturnType<ReturnsThisObject['ping']>, Promise<'pong'>>>,
  Expect<Equal<ReturnType<ReturnsThisObject['latest']>, Promise<unknown>>>,
  Expect<Equal<ReturnType<ServiceReturnsThis['ping']>, Promise<'pong'>>>,
];
