// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { StoredAction } from '../domain/action';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ActionProvider = Strapi.Registries.PackageServices['admin::permission']['actionProvider'];

type StoredSection<TSection extends string> = Extract<StoredAction, { section: TSection }>;

/** What a handler of the provider hook `THook` receives. */
type HookContext<THook extends keyof ActionProvider['hooks']> = Parameters<
  Parameters<ActionProvider['hooks'][THook]['register']>[0]
>[0];

// The provider stores the registration without its `uid`, with its `actionId` and an
// `options.applyToProperties` that defaults to `null`, one member per section
// (`domain/action/index.ts` `create`, `validation/action-provider.ts`).
export type StoredActionAssertions = [
  Expect<Equal<[StoredAction['section']], ['contentTypes' | 'plugins' | 'settings' | 'internal']>>,
  Expect<Equal<[StoredAction['actionId']], [string]>>,
  Expect<Equal<[StoredAction['options']['applyToProperties']], [(string | undefined)[] | null]>>,
  Expect<Equal<'uid' extends keyof StoredAction ? true : false, false>>,
  // Only `settings` actions have a `category`, only `contentTypes` actions have `subjects`, and
  // `plugins` actions have a `pluginName`.
  Expect<Equal<[StoredSection<'settings'>['category']], [string]>>,
  Expect<Equal<[StoredSection<'contentTypes'>['subjects']], [(string | undefined)[]]>>,
  Expect<Equal<[StoredSection<'plugins'>['pluginName']], [string]>>,
  // `subCategory` defaults to `'general'` in `settings` and `plugins`, and is removed elsewhere.
  Expect<Equal<[StoredSection<'settings'>['subCategory']], [string]>>,
  Expect<Equal<[StoredSection<'plugins'>['subCategory']], [string]>>,
  Expect<Equal<'subCategory' extends keyof StoredSection<'internal'> ? true : false, false>>,
  Expect<Equal<'subCategory' extends keyof StoredSection<'contentTypes'> ? true : false, false>>,
];

// With strict types, the action provider hands the stored action to its hooks and returns it from
// `get` and `values`.
export type StoredActionProviderAssertions = [
  Expect<Equal<[HookContext<'willRegister'>], [{ key: string; value: StoredAction }]>>,
  Expect<Equal<[HookContext<'didRegister'>], [{ key: string; value: StoredAction }]>>,
  Expect<Equal<[HookContext<'willDelete'>], [{ key: string; value: StoredAction | undefined }]>>,
  Expect<Equal<[HookContext<'didDelete'>], [{ key: string; value: StoredAction | undefined }]>>,
  Expect<Equal<[HookContext<'appliesPropertyToSubject'>['action']], [StoredAction]>>,
  Expect<Equal<[ReturnType<ActionProvider['get']>], [StoredAction | undefined]>>,
  Expect<Equal<[ReturnType<ActionProvider['values']>], [StoredAction[]]>>,
];

type ActionService = Strapi.Registries.PackageServices['admin::action'];
type ContentTypeService = Strapi.Registries.PackageServices['admin::content-type'];

declare const actionProvider: ActionProvider;
declare const contentTypeService: ContentTypeService;

// With strict types, `admin::action` returns the actions `values` returns, and `admin::content-type`
// builds permissions from them.
export type StoredActionServiceAssertions = [
  Expect<Equal<[Awaited<ReturnType<ActionService['getAllowedActionsForRole']>>], [StoredAction[]]>>,
];
contentTypeService.getPermissionsWithNestedFields(actionProvider.values());
