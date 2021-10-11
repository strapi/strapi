export interface StrapiConfigContext {
  env: (<T = string>(key: string, initial?: T) => T) & {
    int: (key: string, initial?: number) => number;
    float: (key: string, initial?: number) => number;
    bool: (key: string, initial?: boolean) => boolean;
    json: (key: string, initial?: any) => any;
    array: (key: string, initial?: any[]) => any[];
    date: (key: string, initial?: Date) => Date;
  };
}
