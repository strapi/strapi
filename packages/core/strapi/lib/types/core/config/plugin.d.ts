export interface Plugins {
  [key: string]:
    | {
        enabled: boolean;
        resolve?: string;
        config?: object;
      }
    | boolean;
}
