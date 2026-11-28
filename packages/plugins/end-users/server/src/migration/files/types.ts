import type { CodeFinding, FileChange } from '../../../../shared/contracts/migration';

export type { FileChange };

export interface FilesPlan {
  changes: FileChange[];
  findings: CodeFinding[];
}
