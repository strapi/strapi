const path = require('path');
const fs = require('fs');

const ONE_RELATIONS = ['oneToOne', 'manyToOne', 'oneWay'];

const getStrapiIndexPath = projectPath => {
  if (!projectPath) {
    throw new Error(`
-> Path to strapi project is missing.
-> Usage: node migrate-3.4.0.js [path]`);
  }

  const strapiIndexPath = path.resolve(projectPath, 'node_modules', 'strapi', 'lib', 'index.js');

  if (!fs.existsSync(strapiIndexPath)) {
    throw new Error(`
-> Strapi lib couldn\'t be found. Are the node_modules installed?
-> Fix: yarn install or npm install`);
  }

  return strapiIndexPath;
};

const isSortableRFAssoc = a =>
  ONE_RELATIONS.includes(a.nature) && !['created_by', 'updated_by'].includes(a.alias);

const run = async () => {
  const projectPath = process.argv[2];
  const strapiIndexPath = getStrapiIndexPath(projectPath);
  const strapi = require(strapiIndexPath);
  const app = await strapi({ dir: projectPath }).load();

  const contentTypeService = app.plugins['content-manager'].services['content-types'];

  for (const uid of Object.keys(app.contentTypes)) {
    const modelDef = app.getModel(uid);
    const manyRelationFields = modelDef.associations.filter(isSortableRFAssoc);
    if (manyRelationFields.length) {
      const conf = await contentTypeService.findConfiguration({ uid });
      manyRelationFields.forEach(assoc => {
        conf.metadatas[assoc.alias].list.sortable = true;
      });
      await contentTypeService.updateConfiguration({ uid }, conf);
    }
  }
};

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .then(() => {
    console.log('Migration successfully finished! 🎉');
    process.exit(0);
  });
