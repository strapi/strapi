export interface Plugin {
  [key: string]:
    | {
        enabled?: boolean | undefined;
        resolve?: string | undefined;
        config?: unknown | undefined;
      }
    | boolean;
}
