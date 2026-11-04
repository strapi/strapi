import type { Modules } from '@strapi/types';

export type ID = Modules.Database.ID;
export type ColumnInfo = Modules.Database.ColumnInfo;
export type Attribute = Modules.Database.Attribute;
export type CountResult = Modules.Database.CountResult;
export type RelationalAttribute = Modules.Database.RelationalAttribute;
export type BaseAttribute = Modules.Database.BaseAttribute;
export type ScalarAttribute = Modules.Database.ScalarAttribute;
export type JoinColumn = Modules.Database.JoinColumn;
export type BaseJoinTable = Modules.Database.BaseJoinTable;
export type JoinTable = Modules.Database.JoinTable;
export type OrderedJoinTable = Modules.Database.OrderedJoinTable;
export type BidirectionalAttributeJoinTable = Modules.Database.BidirectionalAttributeJoinTable;
export type MorphColumn = Modules.Database.MorphColumn;
export type MorphJoinTable = Modules.Database.MorphJoinTable;
export type BaseRelationalAttribute = Modules.Database.BaseRelationalAttribute;
export type MorphRelationalAttribute = Modules.Database.MorphRelationalAttribute;
export type Model = Modules.Database.Model;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Relation {
  export type Owner = Modules.Database.Relation.Owner;
  export type WithTarget = Modules.Database.Relation.WithTarget;
  export type Bidirectional = Modules.Database.Relation.Bidirectional;
  export type OneToOne = Modules.Database.Relation.OneToOne;
  export type OneToMany = Modules.Database.Relation.OneToMany;
  export type ManyToOne = Modules.Database.Relation.ManyToOne;
  export type ManyToMany = Modules.Database.Relation.ManyToMany;
  export type Morph = Modules.Database.Relation.Morph;
  export type MorphMany = Modules.Database.Relation.MorphMany;
  export type MorphOne = Modules.Database.Relation.MorphOne;
  export type MorphToOne = Modules.Database.Relation.MorphToOne;
  export type MorphToMany = Modules.Database.Relation.MorphToMany;
}

export type MetadataOptions = {
  maxLength: number;
};
