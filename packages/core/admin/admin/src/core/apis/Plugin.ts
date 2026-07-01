/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { immerable } from 'immer';

import { AuthProvider, useAuth } from '../../features/Auth';

export interface PluginConfig
  extends Partial<Pick<Plugin, 'apis' | 'initializer' | 'injectionZones' | 'isReady'>> {
  name: string;
  id: string;
}

const InjectionZoneAuthBoundary = ({ children }: { children: React.ReactNode }) => {
  const hasAuthProvider = useAuth('InjectionZoneAuthBoundary', () => true, false);

  if (hasAuthProvider) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(AuthProvider, null, children);
};

const withInjectionZoneAuth = (Component: React.ComponentType) => {
  const ComponentWithAuth = (props: Record<string, unknown>) =>
    React.createElement(InjectionZoneAuthBoundary, null, React.createElement(Component, props));

  ComponentWithAuth.displayName = `InjectionZoneAuthBoundary(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;

  return ComponentWithAuth as React.ComponentType;
};

export class Plugin {
  [immerable] = true;

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
      this.injectionZones[containerName][blockName].push({
        ...component,
        Component: withInjectionZoneAuth(component.Component),
      });
    } catch (err) {
      console.error('Cannot inject component', err);
    }
  }
}
