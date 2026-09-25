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
Language service checks preserve suggestions with either switch setting: plugin and API names,
full service, controller, and policy UIDs, plugin and API service and controller names, config
namespaces and dotted config paths, route handlers, and route policy names. Dotted paths list one
level at a time. With the switch on, they also cover the plural maps and policy config keys.

The fixtures assign inferred lookup results to constants before checking them with `satisfies`.
This prevents contextual inference from making a permissive generic lookup look correctly typed.
Handler references stay strict in both modes. Registered policy contracts and complete policy
inventories apply only when the switch is on; an empty inventory accepts no policy reference.
With the switch on, unregistered literal service and controller names resolve to `never`, while
explicit generics (`plugin(x).service<T>(name)` or `service<T>(uid)`) win and dynamic names keep
the permissive types.

Dedicated fixtures check config defaults against missing values, nullable values, possibly
undefined defaults, and contextual inference. Policy namespace fixtures check relative plugin
and API names, application overrides, exact-name precedence, and strict-off compatibility.
The i18n and Content Manager adoption fixtures exercise service arguments and nullable results,
controller actions, policy configuration, and application overrides through emitted package
entries. Each provider also has a strict-off fixture to keep registration separate from activation.

Generated applications use `skipLibCheck: true`, so the consumer programs do too. A small separate
case checks the collision limit with both values: incompatible declarations for the same UID
produce TS2717 even when the registry switch is off; `skipLibCheck` suppresses that error.
Applications must include only one contract version for each UID. Application overrides belong
in `AppServices`, `AppConfigs`, `AppControllers`, or `AppPolicies`, separate from `Package*` entries.

The package checks cover every contract provider: the four above, plus GraphQL, Documentation,
Content Releases, Content-Type Builder, Email, Review Workflows, and Upload. They reject strict
activation in emitted declarations, resolve each `strapi-server` entry with every resolver, and
require imports in the public registry contracts to be declared dependencies. That dependency check
is scoped to `dist/server/src/types`; it does not audit pre-existing declarations in the entire
repo. The application entry fixture also checks that every bundled provider's contracts load.
