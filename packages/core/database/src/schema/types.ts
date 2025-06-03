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
  defaultTo?: any;
  notNullable?: boolean | null;
  unsigned?: boolean;
  unique?: boolean;
  primary?: boolean;
}

export type IndexType = 'primary' | 'unique';

export interface Index {
  columns: string[];
  name: string;
  type?: IndexType;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedColumns: string[];
  referencedTable: string;
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
    added: Column[];
    removed: Column[];
    updated: ColumnDiff['diff'][];
    unchanged: Column[];
  };
}

export interface ForeignKeyDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: ForeignKey;
  };
}

export interface ForeignKeysDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: ForeignKey[];
    updated: ForeignKeyDiff['diff'][];
    unchanged: ForeignKey[];
    removed: ForeignKey[];
  };
}

export interface IndexesDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: Index[];
    updated: IndexDiff['diff'][];
    unchanged: Index[];
    removed: Index[];
  };
}

export interface TableDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    indexes: IndexesDiff['diff'];
    columns: ColumnsDiff['diff'];
    foreignKeys: ForeignKeysDiff['diff'];
  };
}

export interface TablesDiff {
  added: Table[];
  removed: Table[];
  updated: Array<TableDiff['diff']>;
  unchanged: Table[];
}

export interface SchemaDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    tables: TablesDiff;
  };
}
