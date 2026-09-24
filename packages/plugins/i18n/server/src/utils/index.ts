type ServiceName = keyof Strapi.Registries.PackageServices extends infer TUID
  ? TUID extends `plugin::i18n.${infer TName}`
    ? TName
    : never
  : never;

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

/** Retrieves a registered i18n service, including application overrides. */
const getService = <TName extends ServiceName>(name: TName) => {
  return strapi.plugin('i18n').service(name);
};

export { getService, getCoreStore };
