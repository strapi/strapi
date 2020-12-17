const path = require('path');
const fs = require('fs');

const ONE_RELATIONS = ['oneToOne', 'manyToOne', 'oneWay'];

const createStrapiApp = async projectPath => {
  if (!projectPath) {
    throw new Error(`
-> Path to strapi project is missing.
-> Usage: node migrate-3.4.0.js [path]`);
  }

  let strapi;
  let app;
  try {
    strapi = require(require.resolve('strapi', { paths: [projectPath] }));
    const pkgJSON = require(path.resolve(projectPath, 'package.json'));
    if (!pkgJSON || !pkgJSON.dependencies || !pkgJSON.dependencies.strapi) {
      throw new Error();
    }
  } catch (e) {
    throw new Error(`
-> Strapi lib couldn\'t be found. Are the node_modules installed?
-> Fix: yarn install or npm install`);
  }

  try {
    app = await strapi({ dir: projectPath }).load();
  } catch (e) {
    throw new Error(`
-> The migration couldn't be procceed because Strapi app couldn't start.
-> ${e.message}`);
  }

  return app;
};

const isSortableRFAssoc = a =>
  ONE_RELATIONS.includes(a.nature) && !['created_by', 'updated_by'].includes(a.alias);

const run = async () => {
  const projectPath = process.argv[2];
  const app = await createStrapiApp(projectPath);

  const contentTypeService = app.plugins['content-manager'].services['content-types'];

  for (const uid of Object.keys(app.contentTypes)) {
    const modelDef = app.getModel(uid);
    const manyRelationFields = modelDef.associations.filter(isSortableRFAssoc);
    if (manyRelationFields.length) {
      const conf = await contentTypeService.findConfiguration({ uid });
      manyRelationFields.forEach(assoc => {
        try {
          conf.metadatas[assoc.alias].list.sortable = true;
        } catch (e) {
          // silence
        }
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
