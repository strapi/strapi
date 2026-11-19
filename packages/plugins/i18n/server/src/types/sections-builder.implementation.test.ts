// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type HandlerContext = Parameters<
  Strapi.Registries.PackageServices['plugin::i18n.permissions']['sectionsBuilder']['localesPropertyHandler']
>[0];

type HandlerSubject = HandlerContext['section']['subjects'][number];

// `registerLocalesPropertyHandler` registers the handler on the admin's `singleTypes` and
// `collectionTypes` sections, which call it with `{ action, section }`
// (admin `services/permission/sections-builder/section.ts`). It reads the action's ID, and each
// subject's UID and properties, to which it adds the locales property.
export type LocalesPropertyHandlerAssertions = [
  Expect<Equal<[HandlerContext['action']], [{ actionId: string }]>>,
  Expect<Equal<[HandlerSubject['uid']], [string]>>,
  Expect<
    Equal<
      [HandlerSubject['properties']],
      [{ label: string; value: string; children?: unknown[] }[]]
    >
  >,
];
