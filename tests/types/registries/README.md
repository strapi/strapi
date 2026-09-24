# Registry consumer tests

Run `node --test tests/types/registries/consumer.test.cjs` after building the packages. The test
uses the installed TypeScript version, real package manifests, and emitted declarations. It does
not redirect imports to source files or replace packages with mocks.

The consumer fixtures load i18n, Sentry, admin, and content-manager through their normal server
entries. They check Bundler, Node, and NodeNext resolution, with the registry switch on and off.
Each resolver also checks all 24 declaration orders for generated schemas, the i18n provider,
the Sentry provider, and application overrides. Separate cases check provider defaults and
activation through `compilerOptions.types: ["@strapi/types/strict"]`.

The application entry `@strapi/strapi/strict-types` is checked through both a declaration-file
import and `compilerOptions.types`, without individual provider imports. These cases verify
that bundled contracts are available while optional Sentry contracts remain unloaded. The
ordinary Strapi entry is checked separately to catch accidental activation.
The built generator also produces imports for the real Sentry package. Consumer programs check
that generation leaves strict mode off, the single opt-in enables Sentry's contracts, and
regeneration removes its contracts when the plugin is no longer enabled.
Language service checks preserve suggestions for config namespaces, plugin config keys, and
plugin service names with either switch setting.

The fixtures assign inferred lookup results to constants before checking them with `satisfies`.
This prevents contextual inference from making a permissive generic lookup look correctly typed.
Handler references stay strict in both modes. Registered policy contracts and complete policy
inventories apply only when the switch is on.

Generated applications use `skipLibCheck: true`, so the consumer programs do too. A small separate
case checks the collision limit with both values: incompatible declarations for the same UID
produce TS2717 even when the registry switch is off; `skipLibCheck` suppresses that error.
Applications must include only one contract version for each UID. Application overrides belong
in `AppServices`, `AppConfigs`, `AppControllers`, or `AppPolicies`, separate from `Package*` entries.

The package checks reject strict activation in emitted declarations and require imports in the
four providers' public registry contracts to be declared dependencies. That dependency check is
scoped to `dist/server/src/types`; it does not audit pre-existing declarations in the entire repo.
