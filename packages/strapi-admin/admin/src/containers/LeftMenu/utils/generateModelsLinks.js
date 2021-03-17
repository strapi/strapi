import { chain, get } from 'lodash';

const generateLinks = (links, type) => {
  return links
    .filter(link => link.isDisplayed)
    .map(link => {
      const collectionTypesPermissions = [
        { action: 'plugins::content-manager.explorer.create', subject: link.uid },
        { action: 'plugins::content-manager.explorer.read', subject: link.uid },
      ];
      const singleTypesPermissions = [
        { action: 'plugins::content-manager.explorer.read', subject: link.uid },
      ];
      const permissions =
        type === 'collectionTypes' ? collectionTypesPermissions : singleTypesPermissions;

      return {
        icon: 'circle',
        destination: `/plugins/content-manager/${link.kind}/${link.uid}`,
        isDisplayed: true,
        label: link.info.label,
        permissions,
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
    collectionTypesSectionLinks: generateLinks(
      get(collectionTypes, 'links', []),
      'collectionTypes'
    ),
    singleTypesSectionLinks: generateLinks(get(singleTypes, 'links', []), 'singleTypes'),
  };
};

export default generateModelsLinks;
export { generateLinks };
