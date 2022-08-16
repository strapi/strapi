class Plugin {
  constructor(pluginConf) {
    this.apis = pluginConf.apis || {};
    this.initializer = pluginConf.initializer || null;
    this.injectionZones = pluginConf.injectionZones || {};
    this.isReady = pluginConf.isReady !== undefined ? pluginConf.isReady : true;
    this.name = pluginConf.name;
    this.pluginId = pluginConf.id;
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

export default (pluginConf) => new Plugin(pluginConf);
