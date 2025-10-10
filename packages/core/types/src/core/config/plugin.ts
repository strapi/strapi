export interface Plugin {
  [key: string]:
    | {
        enabled: boolean;
        resolve?: string;
        config?: object;
      }
    | boolean;
}
