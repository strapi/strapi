import type { FilterableType } from '../builder/operators';
import type { BuilderConditionV2, FieldAccepts } from '../builder/types';
import type { ConditionSource } from './permissions';
import type { RoleListItem } from './roles';

/** A param a condition declares, as its definition does: the one a role's row binds a value to. */
export interface ConditionParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'attribute';
  required: boolean;
  default?: unknown;
  /** For an `attribute` param: the content type the relation it names must point to */
  relationTarget?: string;
  /** The param only matters when an entry is created: the modal shows it on the Create row only */
  createOnly?: boolean;
  /** For a builder `field` input: the kind of field it takes */
  accepts?: FieldAccepts;
}

export interface SelfWritableField {
  /** As the condition reads it: 'profile.plan', 'profile.organization.documentId', 'user.name' */
  field: string;
  /** Role names whose grants let a signed-in user write it, or ['every signed-in user'] for Better Auth's /update-user fields */
  roles: string[];
}

export interface ConditionListItem {
  name: string;
  displayName: string;
  subjects: string[];
  source: ConditionSource;
  /** The params the definition declares, in the order it declares them */
  params: ConditionParam[];
  /** Whether the definition declares a `stamp`: it sets fields when an entry is created */
  stamp: boolean;
  /** Whether the definition declares `lockedFields`: some fields can't change on update */
  lockedFields: boolean;
  usedBy: number;
  /** The roles that hold a permission naming the condition, by name: `usedBy` of them */
  usedByRoles: Array<Pick<RoleListItem, 'documentId' | 'name'>>;
  editable: boolean;
  /**
   * The definition's query when it is a static object (a code definition). Never there for a builder
   * condition, which has `builder`, or when the query is a function of the user: it is computed when
   * it runs.
   */
  query?: Record<string, unknown>;
  /** A builder condition, as version 2 (a version 1 file is upgraded) */
  builder?: BuilderConditionV2;
  /** What the condition names that the project no longer has: while any, it is false for everyone */
  stale?: string[];
  /** The role names its Who checks use */
  rolesNamed?: string[];
  /**
   * Builder conditions only, absent when empty: the user and profile fields the condition reads that
   * a signed-in user can write themselves, so the condition is only as trustworthy as who may write them
   */
  selfWritable?: SelfWritableField[];
  /**
   * Builder conditions only, absent when empty: every user and profile field the condition reads,
   * as `profile.plan` or `user.name`. `selfWritable` says which of them users can write now; this
   * is what the role editor checks a grant it is about to save against.
   */
  reads?: string[];
}

/** A builder condition is a version 2 file; a version 1 file is read as its upgrade */
export type BuilderCondition = BuilderConditionV2;

/** What the builder wrote before version 2: kept so a file of it can be read and upgraded */
export interface BuilderConditionV1 {
  slug: string;
  displayName: string;
  subjects: string[];
  query: { $and: Array<Record<string, unknown>> };
}

export interface ConditionPreviewRequest {
  condition: BuilderConditionV2;
  subject: string;
  userDocumentId: string;
  /** What the admin fills in for the condition's inputs */
  inputs: Record<string, unknown>;
}

/** The answer to a create or an update: the condition, and what the change leaves behind */
export interface ConditionWriteResponse {
  data: ConditionListItem;
  warnings?: {
    /** An input the file no longer declares, and the roles whose rows bound a value to it */
    removedInputs?: Array<{ name: string; roles: string[] }>;
    /** Fields the condition reads that a signed-in user can write: the same as the item's `selfWritable` */
    selfWritable?: SelfWritableField[];
  };
}

export interface ConditionPreviewResponse {
  matching: number;
  total: number;
}

export interface ConditionsStatus {
  isUpdating: boolean;
}

/** A field the builder can use: a type it can filter on, or a relation to another type */
export interface BuilderAttribute {
  name: string;
  type: FilterableType | 'relation';
  /** The values of an enumeration */
  enum?: string[];
  relation?: { target: string; toMany: boolean };
}

/** What the builder page reads to offer fields, from the schemas and the roles */
export interface BuilderLayout {
  contentTypes: Array<{
    uid: string;
    displayName: string;
    kind: 'collectionType' | 'singleType';
    attributes: BuilderAttribute[];
    /** The attributes that are relations to the end user */
    userRelations: string[];
  }>;
  userAttributes: BuilderAttribute[];
  profileAttributes: BuilderAttribute[];
  /** Role names */
  roles: string[];
}
