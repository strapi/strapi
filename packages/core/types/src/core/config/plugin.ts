export interface Plugin {
  [key: string]:
    | {
        enabled?: boolean;
        resolve?: string;
        config?: unknown;
      }
    | boolean;
}
