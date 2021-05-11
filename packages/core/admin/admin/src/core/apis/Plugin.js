class Plugin {
  constructor(pluginConf) {
    this.apis = pluginConf.apis || {};
    // TODO
    this.description = pluginConf.description;
    // TODO
    this.icon = pluginConf.icon;
    this.initializer = pluginConf.initializer || null;

    // TODO
    this.injectedComponents = pluginConf.injectedComponents || undefined;
    this.injectionZones = pluginConf.injectionZones || {};
    this.isReady = pluginConf.isReady !== undefined ? pluginConf.isReady : true;
    // TODO
    this.isRequired = pluginConf.isRequired;
    // TODO
    this.mainComponent = pluginConf.mainComponent || null;
    // TODO
    this.menu = pluginConf.menu || null;
    // TODO
    this.name = pluginConf.name;
    this.pluginId = pluginConf.id;
    // TODO
    this.pluginLogo = pluginConf.pluginLogo;
    // TODO
    this.settings = pluginConf.settings || null;
    // TODO
    this.trads = pluginConf.trads;
  }

  getInjectedComponents(containerName, blockName) {
    try {
      return this.injectionZones[containerName][blockName] || {};
    } catch (err) {
      console.error('Cannot get injected component', err);

      return err;
    }
  }

  injectComponent(containerName, blockName, compo) {
    try {
      this.injectionZones[containerName][blockName].push(compo);
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}

export default pluginConf => new Plugin(pluginConf);
