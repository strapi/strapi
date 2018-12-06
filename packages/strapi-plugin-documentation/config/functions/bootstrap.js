const fs = require('fs');
const path = require('path');

module.exports = async cb => {
  // Check if the plugin users-permissions is installed because the documentation needs it
  if (Object.keys(strapi.plugins).indexOf('users-permissions') === -1) {
    throw new Error('In order to make the documentation plugin works the users-permissions one is required');
  }

  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });
  const restrictedAccess = await pluginStore.get({ key: 'config' });

  if (!restrictedAccess) {
    pluginStore.set({ key: 'config', value: { restrictedAccess: false } });
  }

  let shouldUpdateFullDoc = false;
  const services = strapi.plugins['documentation'].services.documentation;
  // Generate plugins' documentation
  const pluginsWithDocumentationNeeded = services.getPluginsWithDocumentationNeeded();
  pluginsWithDocumentationNeeded.forEach(plugin => {
    const isDocExisting = services.checkIfPluginDocumentationFolderExists(plugin);

    if (!isDocExisting) {
      services.createDocumentationDirectory(services.getPluginDocumentationPath(plugin));
      // create the overrides directory
      services.createDocumentationDirectory(services.getPluginOverrideDocumentationPath(plugin));
      services.createPluginDocumentationFile(plugin);
    } else {
      const needToUpdatePluginDoc = services.checkIfPluginDocNeedsUpdate(plugin);

      if (needToUpdatePluginDoc) {
        services.createPluginDocumentationFile(plugin);
        shouldUpdateFullDoc = true;
      }
    }
  });
  
  // Retrieve all the apis from the apis directory
  const apis = services.getApis();
  // Generate APIS' documentation
  apis.forEach(api => {
    const isDocExisting = services.checkIfDocumentationFolderExists(api);

    if (!isDocExisting) {
      // If the documentation directory doesn't exist create it
      services.createDocumentationDirectory(services.getDocumentationPath(api));
      // Create the overrides directory
      services.createDocumentationDirectory(services.getDocumentationOverridesPath(api));
      // Create the documentation files per version
      services.createDocumentationFile(api); // Then create the {api}.json documentation file
    } else {
      const needToUpdateAPIDoc = services.checkIfAPIDocNeedsUpdate(api);
      
      if (needToUpdateAPIDoc) {
        services.createDocumentationFile(api);
        shouldUpdateFullDoc = true;
      }
    }
  });
  const fullDoc = services.generateFullDoc();
  // // Verify that the correct documentation folder exists in the documentation plugin
  const isMergedDocumentationExists = services.checkIfMergedDocumentationFolderExists();
  const documentationPath = services.getMergedDocumentationPath();

  if (!isMergedDocumentationExists || shouldUpdateFullDoc) {
    // Create the folder
    services.createDocumentationDirectory(documentationPath);
    // Write the file
    fs.writeFileSync(path.resolve(documentationPath, 'full_documentation.json'), JSON.stringify(fullDoc, null, 2), 'utf8');
  }
  cb();
};

