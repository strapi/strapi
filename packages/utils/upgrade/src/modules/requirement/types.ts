import type { Project } from '../project';
import type { MaybePromise } from '../../types';
import type { Version } from '../version';
import { NPMPackageVersion } from '../npm/types';

export type TestResult = { pass: true; error: null } | { pass: false; error: Error };

export interface Requirement {
  name: string;
  description: string;
  isRequired: boolean;
  testCallback: RequirementTestCallback | null;
  children: Requirement[];

  setChildren(children: Requirement[]): this;
  addChild(child: Requirement): this;

  required(): Requirement;
  optional(): Requirement;

  test(context: TestContext): Promise<TestResult>;
}

export interface TestContext {
  target: Version.SemVer;
  npmVersionsMatches: NPMPackageVersion[];
  project: Project;
}

export type RequirementTestCallback = (context: TestContext) => MaybePromise<void>;

export interface RequirementInformation {
  name: string;
  isRequired: boolean;
  position: number;
  remaining: number;
  total: number;
}

export interface ChainEvents {
  start: (information: RequirementInformation) => MaybePromise<void>;
  success: (information: RequirementInformation) => MaybePromise<void>;
  failure: (information: RequirementInformation, error: Error) => MaybePromise<boolean>;
}

export type ChainEventKind = keyof ChainEvents;

export interface Chain {
  requirements: Requirement[];

  on<TEventKind extends ChainEventKind>(event: TEventKind, callback: ChainEvents[TEventKind]): void;

  test(): MaybePromise<TestResult>;
}
