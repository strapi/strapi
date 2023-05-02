import { useStrapiApp } from '../../features/StrapiApp';

const useInjectionZone = (area) => {
  const { getPlugin } = useStrapiApp();

  const [pluginName, page, position] = area.split('.');
  const plugin = getPlugin(pluginName);

  if (!plugin) {
    return null;
  }

  return plugin.getInjectedComponents(page, position);
};

export default useInjectionZone;
