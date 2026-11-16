// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Action } from '../domain/action';
import type {
  ContentPermission,
  PluginPermission,
  SettingPermission,
} from '../../../shared/contracts/permissions';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type SectionsBuilder = Strapi.Registries.PackageServices['admin::permission']['sectionsBuilder'];

declare const sectionsBuilder: SectionsBuilder;

/** The context a handler registered with `addHandler(TName, handler)` receives. */
type HandlerContext<TName extends string> = Parameters<
  Parameters<typeof sectionsBuilder.addHandler<TName>>[1]
>[0];

type SectionOptions = Parameters<SectionsBuilder['createSection']>[1];

type BuiltSections = Awaited<ReturnType<SectionsBuilder['build']>>;

// `createSection`, `deleteSection`, `addHandler` and `addMatcher` end with `return this`
// (`services/permission/sections-builder/builder.ts`).
export type SectionsBuilderChainAssertions = [
  Expect<Equal<[ReturnType<SectionsBuilder['createSection']>], [SectionsBuilder]>>,
  Expect<Equal<[ReturnType<SectionsBuilder['deleteSection']>], [SectionsBuilder]>>,
  Expect<Equal<[ReturnType<SectionsBuilder['addHandler']>], [SectionsBuilder]>>,
  Expect<Equal<[ReturnType<SectionsBuilder['addMatcher']>], [SectionsBuilder]>>,
];

// A section calls its matchers with the action and its handlers with `{ action, section }`, where
// `section` is the result of its initial state factory (`sections-builder/section.ts`).
export type SectionsBuilderOptionsAssertions = [
  Expect<Equal<[Parameters<NonNullable<SectionOptions['matchers']>[number]>], [[action: Action]]>>,
  Expect<
    Equal<
      [Parameters<NonNullable<SectionOptions['handlers']>[number]>[0]],
      [{ action: Action; section: unknown }]
    >
  >,
  Expect<Equal<[ReturnType<NonNullable<SectionOptions['initialStateFactory']>>], [unknown]>>,
];

// The admin creates the `plugins`, `settings`, `singleTypes` and `collectionTypes` sections
// (`sections-builder/index.ts`), and `GET /admin/permissions` serves their built form as
// `GetAll.Response` (`controllers/permission.ts`). A handler registered on one of them receives that
// section; on any other section, the section is `unknown`.
export type SectionsBuilderSectionAssertions = [
  Expect<Equal<[HandlerContext<'singleTypes'>], [{ action: Action; section: ContentPermission }]>>,
  Expect<
    Equal<[HandlerContext<'collectionTypes'>], [{ action: Action; section: ContentPermission }]>
  >,
  Expect<Equal<[HandlerContext<'plugins'>], [{ action: Action; section: PluginPermission[] }]>>,
  Expect<Equal<[HandlerContext<'settings'>], [{ action: Action; section: SettingPermission[] }]>>,
  Expect<Equal<[HandlerContext<'my-section'>], [{ action: Action; section: unknown }]>>,
  Expect<Equal<[BuiltSections['singleTypes']], [ContentPermission]>>,
  Expect<Equal<[BuiltSections['collectionTypes']], [ContentPermission]>>,
  Expect<Equal<[BuiltSections['plugins']], [PluginPermission[]]>>,
  Expect<Equal<[BuiltSections['settings']], [SettingPermission[]]>>,
  Expect<Equal<[BuiltSections['my-section']], [unknown]>>,
];
