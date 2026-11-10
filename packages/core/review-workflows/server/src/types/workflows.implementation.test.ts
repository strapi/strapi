// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { UID } from '@strapi/types';
import type createWorkflowsService from '../services/workflows';
import type { Equal, Expect } from './assert.test';
import type { WorkflowsService } from './services';

type Implementation = ReturnType<typeof createWorkflowsService>;

declare const implementation: Implementation;
declare const contract: WorkflowsService;

// With strict types, the members take the parameters of the contract. Generic members are
// compared instantiated with `'stages'`, except where the implementation cannot name the
// contract's type parameter.
export type WorkflowsImplementationAssertions = [
  Expect<
    Equal<
      Parameters<typeof implementation.find<'stages'>>,
      Parameters<typeof contract.find<'stages'>>
    >
  >,
  // `opts` is gated on the contract's parameter, which resolves `TPopulate` to its constraint
  Expect<
    Equal<
      Parameters<typeof implementation.findById<'stages'>>,
      Parameters<WorkflowsService['findById']>
    >
  >,
  Expect<
    Equal<
      Parameters<typeof implementation.getAssignedWorkflow<'stages'>>,
      Parameters<typeof contract.getAssignedWorkflow<'stages'>>
    >
  >,
  // `opts` keeps the `{}` it had before the tie, which accepts the contract's options
  Expect<
    Equal<
      Parameters<typeof implementation._getAssignedWorkflows<'stages'>>,
      // eslint-disable-next-line @typescript-eslint/ban-types
      [uid: UID.ContentType, opts?: {}]
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['assertContentTypeBelongsToWorkflow']>,
      Parameters<WorkflowsService['assertContentTypeBelongsToWorkflow']>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['assertStageBelongsToWorkflow']>,
      Parameters<WorkflowsService['assertStageBelongsToWorkflow']>
    >
  >,
  // `opts` of `create` and `update` is gated on the contract's parameter
  Expect<Equal<Parameters<Implementation['create']>, Parameters<WorkflowsService['create']>>>,
  Expect<Equal<Parameters<Implementation['update']>, Parameters<WorkflowsService['update']>>>,
  Expect<Equal<Parameters<Implementation['delete']>, Parameters<WorkflowsService['delete']>>>,
];
