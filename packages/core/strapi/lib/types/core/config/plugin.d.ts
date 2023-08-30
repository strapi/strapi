export interface PluginConfigs {
  [key: string]:
    | {
        enabled: boolean;
        resolve?: string;
        config?: object;
      }
    | boolean;
}
