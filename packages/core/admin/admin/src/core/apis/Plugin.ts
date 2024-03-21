/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

export interface PluginConfig
  extends Partial<Pick<Plugin, 'apis' | 'initializer' | 'injectionZones' | 'isReady'>> {
  name: string;
  id: string;
}

export class Plugin {
  apis: Record<string, unknown>;
  initializer: React.ComponentType<{ setPlugin(pluginId: string): void }> | null;
  injectionZones: Record<
    string,
    Record<string, Array<{ name: string; Component: React.ComponentType }>>
  >;
  isReady: boolean;
  name: string;
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
    component: { name: string; Component: React.ComponentType }
  ) {
    try {
      this.injectionZones[containerName][blockName].push(component);
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}
