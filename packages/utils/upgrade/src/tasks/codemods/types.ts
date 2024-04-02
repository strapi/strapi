import { SelectCodemodsCallback } from '../../modules/codemod-runner/types';
import { ConfirmationCallback } from '../../modules/common/types';

import type { Codemod } from '../../modules/codemod';
import type { Logger } from '../../modules/logger';
import type { Version } from '../../modules/version';

export interface RunCodemodsOptions {
  logger: Logger;
  confirm?: ConfirmationCallback;
  selectCodemods: SelectCodemodsCallback;
  cwd?: string;
  dry?: boolean;
  target: Version.ReleaseType | Version.LiteralSemVer | Version.Range;
  uid?: string;
}

export interface ListCodemodsOptions {
  logger: Logger;
  cwd?: string;
  target: Version.ReleaseType | Version.LiteralSemVer | Version.Range;
}
