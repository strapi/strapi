import useStrapi from '../../hooks/useStrapi';

const useInjectionZone = area => {
  const { strapi: globalStrapi } = useStrapi();

  const [pluginName, page, position] = area.split('.');
  const plugin = globalStrapi.getPlugin(pluginName);

  if (!plugin) {
    return null;
  }

  return plugin.getInjectedComponents(page, position);
};

export default useInjectionZone;
