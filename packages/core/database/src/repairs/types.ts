import type { Database } from '..';

// Define the structure of an Operation and the expected result
export interface Operation<TOptions> {
  method: (db: Database, options: TOptions) => any; // Method signature, can return any result
  logMessage: string;
}

export interface RepairManager {
  [key: string]: <TOptions>(options: TOptions) => Promise<any>; // Methods will return a promise
}
