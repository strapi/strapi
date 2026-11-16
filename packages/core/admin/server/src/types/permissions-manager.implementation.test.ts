// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Ability, ForcedSubject } from '@casl/ability';
import type createPermissionsManager from '../services/permission/permissions-manager';
import type createSanitizeHelpers from '../services/permission/permissions-manager/sanitize';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type Article = { id: number; title: string };
type SanitizeOptions = { subject?: unknown; action?: string } | undefined;

declare const article: Article;
declare const implementation: ReturnType<typeof createSanitizeHelpers>;
declare const contract: ReturnType<
  Strapi.Registries.PackageServices['admin::permission']['createPermissionsManager']
>;

const implementationOutput = implementation.sanitizeOutput(article);
const implementationInput = implementation.sanitizeInput([article]);
const implementationQuery = implementation.sanitizeQuery({ populate: '*' });
const contractOutput = contract.sanitizeOutput(article);
const contractInput = contract.sanitizeInput([article]);
const contractQuery = contract.sanitizeQuery({ populate: '*' });

// With strict types, the output and input sanitizers resolve to the data they were given, and the
// query sanitizer to a query object, as the implementation and as the registered contract.
export type PermissionsManagerImplementationAssertions = [
  Expect<Equal<Awaited<typeof implementationOutput>, Article>>,
  Expect<Equal<Awaited<typeof implementationInput>, Article[]>>,
  Expect<Equal<Awaited<typeof implementationQuery>, Record<string, unknown>>>,
  Expect<Equal<Parameters<typeof implementation.sanitizeOutput>[1], SanitizeOptions>>,
  Expect<Equal<Parameters<typeof implementation.sanitizeInput>[1], SanitizeOptions>>,
  Expect<
    Equal<
      Parameters<typeof implementation.sanitizeQuery>,
      [query: unknown, options?: SanitizeOptions]
    >
  >,
  Expect<Equal<Awaited<typeof contractOutput>, Article>>,
  Expect<Equal<Awaited<typeof contractInput>, Article[]>>,
  Expect<Equal<Awaited<typeof contractQuery>, Record<string, unknown>>>,
  Expect<
    Equal<Parameters<typeof contract.sanitizeQuery>, [query: unknown, options?: SanitizeOptions]>
  >,
];

type CreatePermissionsManager =
  Strapi.Registries.PackageServices['admin::permission']['createPermissionsManager'];
type ManagerOptions = Parameters<CreatePermissionsManager>[0];

declare const ability: Ability;
declare const action: string;
declare const create: CreatePermissionsManager;

// The admin, CM, CR and upload callers: with an action (upload `admin-file.ts:19`) or without one
// (CM `permission-checker.ts:40`, admin `role.ts:69`).
const managerWithAction = create({ ability, action, model: 'plugin::upload.file' });
const managerWithoutAction = create({ ability, model: 'admin::role' });

const subject = managerWithAction.toSubject(article);
const queryWithFilters = managerWithAction.addPermissionsQueryTo(
  { limit: 100, filters: { title: 'foo' } },
  action
);
const queryWithoutQuery = managerWithAction.addPermissionsQueryTo();

// With strict types, the registered contract creates a permissions manager from the user's CASL
// ability, a model UID and an optional action. The manager exposes them as given, tags objects as
// subjects, and adds the ability's conditions to a copy of the query as its `filters`.
export type PermissionsManagerContractAssertions = [
  Expect<Equal<[ManagerOptions['ability']], [Ability]>>,
  Expect<Equal<[ManagerOptions['model']], [string]>>,
  Expect<Equal<[ManagerOptions['action']], [string | undefined]>>,
  Expect<Equal<[typeof managerWithAction.ability], [Ability]>>,
  Expect<Equal<[typeof managerWithAction.model], [string]>>,
  Expect<Equal<[typeof managerWithAction.action], [string]>>,
  Expect<Equal<[typeof managerWithoutAction.action], [undefined]>>,
  Expect<Equal<[typeof subject], [Article & ForcedSubject<string>]>>,
  Expect<Equal<[Parameters<typeof managerWithAction.getQuery>], [[queryAction?: string]]>>,
  Expect<Equal<[typeof queryWithFilters.limit], [number]>>,
  Expect<Equal<[typeof queryWithFilters.filters], [unknown]>>,
  Expect<Equal<[typeof queryWithoutQuery.filters], [unknown]>>,
  Expect<Equal<[Parameters<typeof managerWithAction.validateQuery>[0]], [unknown]>>,
  Expect<Equal<[Parameters<typeof managerWithAction.validateInput>[0]], [unknown]>>,
];

// The contract is written, so the compiler does not check it against the implementation. The
// implementation's manager is assignable to it. Its `ability`, `action`, `model`, `toSubject` and
// `addPermissionsQueryTo` are `any`, so this only checks the typed members (`isAllowed`,
// `pickPermittedFieldsOf`, `getQuery`'s result, the sanitizers and the validators' results).
type ImplementationManager = ReturnType<typeof createPermissionsManager>;
type ContractManager = ReturnType<CreatePermissionsManager>;
export type PermissionsManagerImplementationIsAssignable = Expect<
  [ImplementationManager] extends [ContractManager] ? true : false
>;
