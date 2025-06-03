import { Codemod } from '../codemod';

import type { Logger } from '../logger';
import type { Version } from '../version';

export type SelectCodemodsCallback = (
  codemods: Codemod.VersionedCollection[]
) => Promise<Codemod.VersionedCollection[]>;

export type CodemodRunnerReport =
  | {
      success: true;
      error: null;
    }
  | { success: false; error: Error };

export interface CodemodRunnerInterface {
  setRange(range: Version.Range): this;
  setLogger(logger: Logger): this;

  dry(enabled?: boolean): this;
  onSelectCodemods(callback: SelectCodemodsCallback | null): this;

  run(codemodsDirectory?: string): Promise<CodemodRunnerReport>;
  runByUID(uid: string, codemodsDirectory?: string): Promise<CodemodRunnerReport>;
}
