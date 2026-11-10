// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
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
