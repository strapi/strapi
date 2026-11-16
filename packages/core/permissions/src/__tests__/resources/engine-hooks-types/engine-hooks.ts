/**
 * Compile-only checks of the engine hook types, run by `engine-hooks.types.vitest.test.ts`.
 * A failed assertion is a type error, and an unused `@ts-expect-error` is one too.
 */
import { engine } from '../../../index';
import type { Permission } from '../../../domain/permission';
import type { PermissionRule } from '../../../types';
import {
  createBeforeEvaluateContext,
  createEngineHooks,
  createValidateContext,
  createWillRegisterContext,
} from '../../../engine/hooks';
import type { PermissionEngineHooks } from '../../../engine/hooks';

/** `true` when X and Y are the same type. Wrap both in a tuple, as a bare `any` matches loosely. */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

type AnyHandler = (...args: any[]) => any;

/*
 * 1. What the engine exposes keeps untyped handlers.
 */

export type DefaultTypes = [
  Expect<Equal<[Parameters<engine.Engine['on']>[1]], [AnyHandler]>>,
  Expect<Equal<[Parameters<engine.Engine['generateAbility']>[0]], [Permission[]]>>,
  Expect<
    Equal<
      [Parameters<PermissionEngineHooks['before-register.permission']['register']>[0]],
      [AnyHandler]
    >
  >,
  Expect<
    Equal<[Parameters<PermissionEngineHooks['before-evaluate.permission']['call']>[0]], [unknown]>
  >,
  Expect<
    IsAny<Awaited<ReturnType<PermissionEngineHooks['before-format::validate.permission']['call']>>>
  >,
  // `any`, as the untyped waterfall interface resolves, so the engine assigns to its typed view
  Expect<IsAny<Awaited<ReturnType<PermissionEngineHooks['format.permission']['call']>>>>,
];

declare const untypedEngine: engine.Engine;
untypedEngine.on('before-register.permission', (first: string, second: number) => first + second);

/*
 * 2. The typed hooks and engine, which a typed contract can declare instead.
 */

type Hooks = engine.TypedPermissionEngineHooks;
declare const hooks: Hooks;

hooks['before-evaluate.permission'].register((context) => context.addCondition('isOwner'));
// @ts-expect-error a handler must take the hook's context
hooks['before-evaluate.permission'].register((context: { user: unknown }) => context.user);

export const callTypedHooks = async () => {
  // @ts-expect-error a registered handler takes the hook's context, not a string
  await hooks['before-evaluate.permission'].getHandlers()[0]('not a context');
  // @ts-expect-error the hook is called with its context
  await hooks['before-evaluate.permission'].call('not a context');
  // @ts-expect-error the hook is called with its context
  await hooks['before-register.permission'].call({ permission: {} });
  // @ts-expect-error the hook is called with a permission
  await hooks['format.permission'].call('not a permission');
};

hooks['before-register.permission'].register(({ permission, condition }) => {
  condition.and({ subject: permission.subject });
});

export type TypedContexts = [
  Expect<
    Equal<
      [Parameters<Parameters<Hooks['after-format::validate.permission']['register']>[0]>[0]],
      [engine.ValidateContext]
    >
  >,
  Expect<
    Equal<
      [engine.ValidateContext['permission']['properties']],
      [Record<string, unknown> | undefined]
    >
  >,
  Expect<Equal<[engine.WillRegisterContext['permission']], [PermissionRule]>>,
  Expect<
    Equal<
      [ReturnType<engine.WillRegisterContext['condition']['and']>],
      [engine.WillRegisterCondition]
    >
  >,
  Expect<
    Equal<[Awaited<ReturnType<Hooks['format.permission']['call']>>], [engine.TypedPermission]>
  >,
];

declare const typedEngine: engine.TypedEngine;
typedEngine.on('before-register.permission', ({ condition }) => condition.or({ id: 1 }));
// @ts-expect-error a handler must take the context of the hook it is registered on
typedEngine.on('format.permission', (context: engine.BeforeEvaluateContext) => context);
// @ts-expect-error the hook name is checked
typedEngine.on('not.a.hook', () => undefined);

/*
 * 3. The engine and the contexts it builds at runtime are their typed views, without a cast.
 */

declare const permission: Permission;
declare const rule: PermissionRule;

export const validateContext: engine.ValidateContext = createValidateContext(permission);
export const beforeEvaluateContext: engine.BeforeEvaluateContext =
  createBeforeEvaluateContext(permission);
export const willRegisterContext: engine.WillRegisterContext = createWillRegisterContext({
  permission: rule,
  options: { id: 1 },
});

declare const params: engine.EngineParams;
export const engineHooks: Hooks = createEngineHooks();
export const typedEngineFromNew: engine.TypedEngine = engine.new(params);
