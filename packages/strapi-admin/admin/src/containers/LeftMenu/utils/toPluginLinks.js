import get from 'lodash/get';
import omit from 'lodash/omit';
import sortLinks from '../../../utils/sortLinks';

const toPluginLinks = plugins => {
  const pluginsLinks = Object.values(plugins).reduce((acc, current) => {
    const pluginsSectionLinks = get(current, 'menu.pluginsSectionLinks', []);

    return [...acc, ...pluginsSectionLinks];
  }, []);

  const sortedLinks = sortLinks(pluginsLinks).map(link => {
    return { ...omit(link, 'name') };
  });

  return sortedLinks;
};

export default toPluginLinks;
