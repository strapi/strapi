import type { CodeFinding } from '../../../../shared/contracts/migration';

/** One file a project changes: `before` null is a file created, `after` null a file deleted */
export interface FileChange {
  path: string;
  before: string | null;
  after: string | null;
}

export interface FilesPlan {
  changes: FileChange[];
  findings: CodeFinding[];
}
