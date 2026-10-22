// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
const override = strapi.plugin('documentation').service('override');

// Plugins register their OpenAPI parts as objects or as YAML text.
override.registerOverride('openapi: 3.0.0', {
  pluginOrigin: 'users-permissions',
  excludeFromGeneration: ['users-permissions'],
}) satisfies void;
override.registerOverride({ info: { title: 'API', version: '2.0.0' }, paths: {} });
override.registerOverride({ tags: [] }, { excludeFromGeneration: ['homepage'] });
// @ts-expect-error An override is an OpenAPI part or its text.
override.registerOverride(['openapi: 3.0.0']);
// @ts-expect-error The plugin origin is a plugin name.
override.registerOverride({ tags: [] }, { pluginOrigin: true });

override.excludeFromGeneration(['upload', 'users-permissions']);
override.isEnabled('upload') satisfies boolean;
// @ts-expect-error Registered services have no arbitrary members.
override.missing();

const documentation = strapi.service('plugin::documentation.documentation');
documentation.generateFullDoc('1.0.0') satisfies Promise<void>;
documentation.getDocumentationVersions() satisfies Array<{
  version: string;
  generatedDate: string;
  url: string;
}>;
// @ts-expect-error Registered services have no arbitrary members.
documentation.missing();
