// TODO: [TS2] Change the name of this file to something clearer

export interface DocumentServicePluginParams {}

export interface EntityServicePluginParams {}

export interface PluginActivation {
  [key: keyof any]: unknown;
}
