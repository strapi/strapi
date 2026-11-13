export type FieldAccepts = 'text' | 'number' | 'date' | 'boolean' | { relation: string };

export interface BuilderInput {
  name: string;
  kind: 'text' | 'number' | 'boolean' | 'field';
  accepts?: FieldAccepts;
  required: boolean;
  default?: string | number | boolean;
}

export type BuilderValue =
  | { kind: 'fixed'; value: string | number | boolean | Array<string | number> }
  | { kind: 'input'; name: string }
  /** 'documentId', 'email', 'roles.documentId', or a public attribute */
  | { kind: 'user'; attribute: string }
  /** A public attribute, or '<toOneRelation>.documentId' */
  | { kind: 'profile'; attribute: string }
  | { kind: 'now'; offset?: { amount: number; unit: 'minutes' | 'hours' | 'days' } };

export type WhoCheck =
  | {
      kind: 'attribute';
      source: 'user' | 'profile';
      attribute: string;
      operator: string;
      value?: BuilderValue;
    }
  /** `roles` are role names */
  | { kind: 'roles'; match: 'any' | 'none'; roles: string[] }
  | { kind: 'email-verified'; value: boolean };

export type FieldTarget = { path: string[] } | { input: string };

export interface EntryCheck {
  kind: 'check';
  target: FieldTarget;
  operator: string;
  value?: BuilderValue;
}

export interface EntryGroup {
  kind: 'group';
  match: 'all' | 'any' | 'none';
  items: Array<EntryCheck | EntryGroup>;
}

export interface StampRule {
  field: string;
  value:
    | { kind: 'user' }
    | { kind: 'input'; name: string }
    | { kind: 'fixed'; value: string | number | boolean };
}

export type AppliesTo =
  { kind: 'all' } | { kind: 'user-relation' } | { kind: 'types'; types: string[] };

export interface BuilderConditionV2 {
  version: 2;
  slug: string;
  displayName: string;
  appliesTo: AppliesTo;
  inputs: BuilderInput[];
  who: { match: 'all' | 'any'; checks: WhoCheck[] };
  which: EntryGroup;
  onSave: { stamp: StampRule[]; locked: string[] };
}

export const BUILDER_LIMITS = {
  fileBytes: 65_536,
  inputs: 20,
  checks: 50,
  nestedGroups: 1,
  relationHops: 2,
  listValues: 100,
  textLength: 1_000,
} as const;
