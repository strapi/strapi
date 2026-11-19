// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type Contract = Strapi.Registries.PackageServices['admin::project-settings'];
type DeleteOldFilesParams = Parameters<Contract['deleteOldFiles']>[0];

/** The project settings `updateProjectSettings` reads from the core store before the update. */
type StoredSettings = Strapi.Registries.Stores['core_admin_project-settings'] | null;
/** The project settings `updateProjectSettings` is about to store. */
type NewSettings = Parameters<Contract['updateProjectSettings']>[0];

// With strict types, `deleteOldFiles` takes the stored settings, `null` when the store has no row,
// and the settings about to be stored, as `updateProjectSettings` passes them.
export type ProjectSettingsImplementationAssertions = [
  Expect<
    Equal<[DeleteOldFilesParams], [{ previousSettings: StoredSettings; newSettings: NewSettings }]>
  >,
  Expect<Equal<[DeleteOldFilesParams['previousSettings']], [StoredSettings]>>,
  Expect<Equal<[DeleteOldFilesParams['newSettings']], [NewSettings]>>,
];
