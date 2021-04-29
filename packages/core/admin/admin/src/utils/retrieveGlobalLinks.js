import { get } from 'lodash';

const retrieveGlobalLinks = pluginsObj => {
  return Object.values(pluginsObj).reduce((acc, current) => {
    const links = get(current, ['settings', 'global', 'links'], null);

    if (links) {
      for (let i = 0; i < links.length; i++) {
        acc.push(links[i]);
      }
    }

    return acc;
  }, []);
};

export default retrieveGlobalLinks;
