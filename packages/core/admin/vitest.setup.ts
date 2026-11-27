/**
 * Port of `tests/setup/unit.setup.js` from the Jest unit preset.
 *
 * Many admin server tests assign a plain object to `global.strapi` and rely on the
 * `strapi.service('admin::…')` / `strapi.plugin()` helpers being attached on assignment.
 */
import formExtensionsService from './server/src/services/form-extensions';

type Registry = Record<string, any>;

let strapiInstance: any;

const decorate = (registry: Registry | undefined) => {
  Object.values(registry ?? {}).forEach((acc: Registry) => {
    acc.controller = (name: string) => acc.controllers[name];
    acc.service = (name: string) => acc.services[name];
    acc.contentType = (name: string) => acc.contentTypes[name];
    acc.policy = (name: string) => acc.policies[name];
  });
};

Object.defineProperty(globalThis, 'strapi', {
  configurable: true,
  get() {
    return strapiInstance;
  },
  set(value) {
    strapiInstance = value;

    strapiInstance.plugin = (name: string) => strapiInstance.plugins[name];
    decorate(strapiInstance.plugins);

    strapiInstance.api = (name: string) => strapiInstance.apis[name];
    decorate(strapiInstance.api);

    // Controllers run every save through the form extensions: tests that do not mock them get
    // the real service with no plugin params, which saves the core values as they are
    const formExtensions = formExtensionsService();

    strapiInstance.service = (name = '') => {
      if (name.startsWith('admin::')) {
        const serviceName = name.split('admin::')[1];

        return (
          strapiInstance.admin.services[serviceName] ??
          (serviceName === 'form-extensions' ? formExtensions : undefined)
        );
      }
    };
  },
});
