/* eslint-disable check-file/filename-naming-convention */
import { Plugin as IPlugin } from '@strapi/helper-plugin';

export interface PluginConfig
  extends Pick<IPlugin, 'apis' | 'initializer' | 'injectionZones' | 'isReady' | 'name'> {
  id: string;
}

export class Plugin implements IPlugin {
  apis: PluginConfig['apis'];
  initializer: PluginConfig['initializer'];
  injectionZones: PluginConfig['injectionZones'];
  isReady: PluginConfig['isReady'];
  name: PluginConfig['name'];
  pluginId: PluginConfig['id'];

  constructor(pluginConf: PluginConfig) {
    this.apis = pluginConf.apis || {};
    this.initializer = pluginConf.initializer || null;
    this.injectionZones = pluginConf.injectionZones || {};
    this.isReady = pluginConf.isReady !== undefined ? pluginConf.isReady : true;
    this.name = pluginConf.name;
    this.pluginId = pluginConf.id;
  }

  getInjectedComponents(containerName: string, blockName: string) {
    try {
      return this.injectionZones[containerName][blockName] || [];
    } catch (err) {
      console.error('Cannot get injected component', err);

      return [];
    }
  }

  injectComponent(
    containerName: string,
    blockName: string,
    component: ReturnType<IPlugin['getInjectedComponents']>[number]
  ) {
    try {
      this.injectionZones[containerName][blockName].push(component);
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}
