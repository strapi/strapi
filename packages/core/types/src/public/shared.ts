export interface DocumentServicePluginParams {}

export interface EntityServicePluginParams {}

export interface PluginActivation {
  [key: keyof any]: unknown;
}
