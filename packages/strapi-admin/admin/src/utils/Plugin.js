class Plugin {
  pluginId = null;

  decorators = {};

  injectionZones = {};

  apis = {};

  constructor(pluginConf) {
    this.pluginId = pluginConf.id;
    this.decorators = pluginConf.decorators || {};
    this.injectionZones = pluginConf.injectionZones || {};
    this.apis = pluginConf.apis || {};
  }

  decorate(compoName, compo) {
    if (this.decorators && this.decorators[compoName]) {
      this.decorators[compoName] = compo;
    }
  }

  getDecorator(compoName) {
    if (this.decorators) {
      return this.decorators[compoName] || null;
    }

    return null;
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
