import { chain, get } from 'lodash';

const generateLinks = links => {
  return links
    .filter(link => link.isDisplayed)
    .map(link => {
      return {
        icon: 'circle',
        destination: `/plugins/content-manager/${link.kind}/${link.uid}`,
        isDisplayed: false,
        label: link.info.label,
        permissions: [
          { action: 'plugins::content-manager.explorer.create', subject: link.uid },
          { action: 'plugins::content-manager.explorer.read', subject: link.uid },
          { action: 'plugins::content-manager.explorer.update', subject: link.uid },
        ],
      };
    });
};

const generateModelsLinks = models => {
  const [collectionTypes, singleTypes] = chain(models)
    .groupBy('kind')
    .map((value, key) => ({ name: key, links: value }))
    .sortBy('name')
    .value();

  return {
    collectionTypesSectionLinks: generateLinks(get(collectionTypes, 'links', [])),
    singleTypesSectionLinks: generateLinks(get(singleTypes, 'links', [])),
  };
};

export default generateModelsLinks;
export { generateLinks };
