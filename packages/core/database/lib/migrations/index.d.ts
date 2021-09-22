import { Database } from '../';

export interface MigrationProvider {
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

export function createMigrationsProvider(db: Database): MigrationProvider;
