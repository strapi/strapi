import { chain } from 'lodash';

const generateLinks = links => {
  return links
    .filter(link => link.isDisplayed)
    .map(link => {
      return {
        icon: 'circle',
        destination: `/plugins/content-manager/${link.schema.kind}/${link.uid}`,
        isDisplayed: false,
        label: link.label,
        // TODO set the permissions
        permissions: [
          { action: 'plugins::content-manager.explorer.create', subject: link.uid },
          { action: 'plugins::content-manager.explorer.read', subject: link.uid },
          { action: 'plugins::content-manager.explorer.update', subject: link.uid },
        ],
      };
    });
};

const generateModelLinks = models => {
  const [collectionTypes, singleTypes] = chain(models)
    .groupBy('schema.kind')
    .map((value, key) => ({ name: key, links: value }))
    .sortBy('name')
    .value();

  return {
    collectionTypesSectionLinks: generateLinks(collectionTypes.links),
    singleTypesSectionLinks: generateLinks(singleTypes.links),
  };
};

export default generateModelLinks;
export { generateLinks };
