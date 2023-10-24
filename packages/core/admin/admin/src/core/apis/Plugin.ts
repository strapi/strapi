/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

interface IPlugin {
  apis: Record<string, unknown>;
  initializer: React.ComponentType<{ setPlugin(pluginId: string): void }>;
  injectionZones: Record<string, Record<string, React.ComponentType[]>>;
  isReady: boolean;
  name: string;
  id: string;
}

export class Plugin {
  apis: IPlugin['apis'];
  initializer: IPlugin['initializer'];
  injectionZones: IPlugin['injectionZones'];
  isReady: IPlugin['isReady'];
  name: IPlugin['name'];
  pluginId: IPlugin['id'];

  constructor(pluginConf: IPlugin) {
    this.apis = pluginConf.apis || {};
    this.initializer = pluginConf.initializer || null;
    this.injectionZones = pluginConf.injectionZones || {};
    this.isReady = pluginConf.isReady !== undefined ? pluginConf.isReady : true;
    this.name = pluginConf.name;
    this.pluginId = pluginConf.id;
  }

  getInjectedComponents(containerName: string, blockName: string) {
    try {
      return this.injectionZones[containerName][blockName] || {};
    } catch (err) {
      console.error('Cannot get injected component', err);

      return err;
    }
  }

  injectComponent(containerName: string, blockName: string, component: React.ComponentType) {
    try {
      this.injectionZones[containerName][blockName].push(component);
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}
