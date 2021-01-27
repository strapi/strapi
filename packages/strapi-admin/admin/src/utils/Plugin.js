class Plugin {
  pluginId = null;

  decorators = {};

  injectedComponents = {};

  apis = {};

  constructor(pluginConf) {
    this.pluginId = pluginConf.id;
    this.decorators = pluginConf.decorators || {};
    this.injectedComponents = pluginConf.injectedComponents || {};
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
      return this.injectedComponents[containerName][blockName] || {};
    } catch (err) {
      console.error('Cannot get injected component', err);

      return err;
    }
  }

  injectComponent(containerName, blockName, compo) {
    try {
      this.injectedComponents[containerName][blockName].push(compo);
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}

export default pluginConf => new Plugin(pluginConf);
