// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { ExtensionService, ShadowCRUDFieldManager, ShadowCRUDManager } from './services';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type Manager = ReturnType<ExtensionService['shadowCRUD']>;
type FieldManager = ReturnType<Manager['field']>;

// The registered contract names the managers: every `disable*` method returns its manager, through
// `use` as well.
export type ShadowCRUDAssertions = [
  Expect<Equal<[Manager], [ShadowCRUDManager]>>,
  Expect<Equal<[ReturnType<Manager['disable']>], [ShadowCRUDManager]>>,
  Expect<Equal<[ReturnType<Manager['disableQueries']>], [ShadowCRUDManager]>>,
  Expect<Equal<[ReturnType<Manager['disableMutations']>], [ShadowCRUDManager]>>,
  Expect<Equal<[ReturnType<Manager['disableAction']>], [ShadowCRUDManager]>>,
  Expect<Equal<[ReturnType<Manager['disableActions']>], [ShadowCRUDManager]>>,
  Expect<Equal<[Parameters<Manager['disableActions']>], [[actions?: string[]]]>>,
  Expect<Equal<[FieldManager], [ShadowCRUDFieldManager]>>,
  Expect<Equal<[ReturnType<FieldManager['disable']>], [ShadowCRUDFieldManager]>>,
  Expect<Equal<[ReturnType<FieldManager['disableInput']>], [ShadowCRUDFieldManager]>>,
  Expect<Equal<[ReturnType<FieldManager['disableOutput']>], [ShadowCRUDFieldManager]>>,
  Expect<Equal<[ReturnType<FieldManager['disableFilters']>], [ShadowCRUDFieldManager]>>,
  Expect<
    Equal<[ReturnType<ReturnType<ExtensionService['use']>['shadowCRUD']>], [ShadowCRUDManager]>
  >,
];
