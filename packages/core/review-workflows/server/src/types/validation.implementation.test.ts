// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { ValidationService } from './services';
import type validation from '../services/validation';

type Validation = ReturnType<typeof validation>;

export type Assertions = [
  Expect<Equal<ReturnType<Validation['getLimits']>, ReturnType<ValidationService['getLimits']>>>,
  Expect<
    Equal<
      Parameters<Validation['validateWorkflowStages']>,
      Parameters<ValidationService['validateWorkflowStages']>
    >
  >,
  Expect<
    Equal<
      Parameters<Validation['validateWorkflowCountStages']>,
      Parameters<ValidationService['validateWorkflowCountStages']>
    >
  >,
];
