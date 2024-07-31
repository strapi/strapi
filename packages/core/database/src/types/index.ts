import type { Action, SubscriberFn } from '../lifecycles';
import type { ForeignKey, Index } from '../schema/types';

export type ID = string | number;
export interface ColumnInfo {
  unsigned?: boolean;
  defaultTo?: unknown;
}

export type Attribute = ScalarAttribute | RelationalAttribute;

export type RelationalAttribute =
  | Relation.OneToOne
  | Relation.OneToMany
  | Relation.ManyToOne
  | Relation.ManyToMany
  | Relation.MorphMany
  | Relation.MorphOne
  | Relation.MorphToOne
  | Relation.MorphToMany;

export interface BasAttribute {
  type: string;
  columnName?: string;
  default?: any;
  column?: ColumnInfo;
  required?: boolean;
  unique?: boolean;
  component?: string;
  repeatable?: boolean;
  columnType?: {
    type: string;
    args: unknown[];
  };
  searchable?: boolean;
}

export interface ScalarAttribute extends BasAttribute {
  type:
    | 'increments'
    | 'password'
    | 'email'
    | 'string'
    | 'enumeration'
    | 'uid'
    | 'richtext'
    | 'text'
    | 'json'
    | 'integer'
    | 'biginteger'
    | 'float'
    | 'decimal'
    | 'boolean'
    | 'date'
    | 'time'
    | 'datetime'
    | 'timestamp'
    | 'blocks';
}

export interface JoinColumn {
  name: string;
  referencedColumn: string;
  referencedTable?: string;
}

export interface BaseJoinTable {
  name: string;
  joinColumn: JoinColumn;
  orderBy?: Record<string, 'asc' | 'desc'>;
  on?: Record<string, unknown>;
  pivotColumns: string[];
  inverseJoinColumn: {
    name: string;
    referencedColumn: string;
  };
}

export interface JoinTable extends BaseJoinTable {
  orderColumnName?: string;
  inverseOrderColumnName?: string;
}

export interface OrderedJoinTable extends BaseJoinTable {
  orderColumnName: string;
  inverseOrderColumnName: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Relation {
  export type Owner = {
    inversedBy: string;
  };

  export type WithTarget = {
    target: string;
  };

  export type Bidirectional = OneToOne | OneToMany | ManyToOne | ManyToMany;

  type BaseBidirectional = {
    type: 'relation';
    relation: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    target: string;
    inversedBy?: string;
    mappedBy?: string;
    joinTable: BidirectionalAttributeJoinTable;
  };

  export type OneToOne = BaseBidirectional & {
    relation: 'oneToOne';
    useJoinTable?: boolean;
    joinTable?: JoinTable;
    joinColumn?: JoinColumn;
    owner?: boolean;
  };

  export type OneToMany = BaseBidirectional & {
    relation: 'oneToMany';
    joinTable: OrderedJoinTable;
    joinColumn?: JoinColumn;
    owner?: boolean;
  };

  export type ManyToOne = BaseBidirectional & {
    relation: 'manyToOne';
    useJoinTable?: boolean;
    joinTable?: JoinTable;
    joinColumn?: JoinColumn;
    owner?: boolean;
  };

  export type ManyToMany = BaseBidirectional & {
    relation: 'manyToMany';
    joinTable: OrderedJoinTable;
  };

  export type Morph = MorphMany | MorphOne | MorphToOne | MorphToMany;

  export type MorphMany = {
    type: 'relation';
    relation: 'morphMany';
    target: string;
    morphBy: string;
    joinTable: MorphJoinTable;
  };

  export type MorphOne = {
    type: 'relation';
    relation: 'morphOne';
    target: string;
    morphBy: string;
  };

  export type MorphToOne = {
    type: 'relation';
    relation: 'morphToOne';
    owner?: boolean;
    morphColumn: MorphColumn;
  };

  export type MorphToMany = {
    type: 'relation';
    relation: 'morphToMany';
    joinTable: MorphJoinTable;
  };
}

export interface BidirectionalAttributeJoinTable extends JoinTable {
  orderColumnName: string;
  inverseOrderColumnName: string;
}

export interface MorphColumn {
  typeField?: string;
  typeColumn: {
    name: string;
  };
  idColumn: {
    name: string;
    referencedColumn: string;
  };
}

export interface MorphJoinTable {
  name: string;
  joinColumn: JoinColumn;
  orderBy?: Record<string, 'asc' | 'desc'>;
  on?: Record<string, unknown>;
  pivotColumns: string[];
  morphColumn: MorphColumn;
}

export interface BaseRelationalAttribute {
  type: 'relation';
  target: string;
  useJoinTable?: boolean;
  joinTable?: JoinTable | MorphJoinTable;
  morphBy?: string;
  inversedBy?: string;
  owner?: boolean;
  morphColumn?: MorphColumn;
  joinColumn?: JoinColumn;
  // TODO: remove this
  component?: string;
}

export interface MorphRelationalAttribute extends BaseRelationalAttribute {
  relation: 'morphMany' | 'morphOne' | 'morphToOne' | 'morphToMany';
  morphColumn: MorphColumn;
  morphBy: string;
  joinTable: MorphJoinTable;
  target: string;
}

export interface Model {
  uid: string;
  tableName: string;
  singularName: string;
  attributes: Record<string, Attribute>;
  indexes?: Index[];
  foreignKeys?: ForeignKey[];
  lifecycles?: Partial<Record<Action, SubscriberFn>>;
}
