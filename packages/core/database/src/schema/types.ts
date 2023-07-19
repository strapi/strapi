export interface Schema {
  tables: Table[];
}

export interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
}

export interface Column {
  type: string;
  name: string;
  args?: unknown[];
  defaultTo?: unknown;
  notNullable: boolean | null;
  unsigned?: boolean;
  unique?: boolean;
  primary?: boolean;
}

export type IndexType = 'primary' | 'unique' | null;

export interface Index {
  columns: string[];
  name: string;
  type: IndexType;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedColumns: string[];
  referencedTable: string | null;
  onUpdate?: string | null;
  onDelete?: string | null;
}

export interface IndexDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: Index;
  };
}

export interface ColumnDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: Column;
  };
}

export interface ColumnsDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: ColumnDiff[];
    removed: ColumnDiff[];
    updated: ColumnDiff[];
    unchanged: ColumnDiff[];
  };
}

export interface ForeignKeyDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: ForeignKey;
  };
}

export interface TableDiff {
  name: string;
  indexes: {
    removed: IndexDiff[];
    updated: IndexDiff[];
    added: IndexDiff[];
  };
  columns: ColumnsDiff;
  foreignKeys: {
    removed: ForeignKeyDiff[];
    updated: ForeignKeyDiff[];
    added: ForeignKeyDiff[];
  };
}

export interface TablesDiff {
  status: 'CHANGED' | 'UNCHANGED';
  added: TableDiff[];
  removed: TableDiff[];
  updated: TableDiff[];
}

export interface SchemaDiff {
  status: 'CHANGED' | 'UNCHANGED';
  tables: TablesDiff;
}
