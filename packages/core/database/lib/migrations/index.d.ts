import { Database } from '../';

export interface MigrationProvider {
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

export async function createMigrationsProvider(db: Database): MigrationProvider;

export async function findMigrationsDir(root: string): string;
