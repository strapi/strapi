import type { Version } from '../../modules/version';

import type { Logger } from '../../modules/logger';
import type { ConfirmationCallback } from '../../modules/upgrader';

export interface UpgradeOptions {
  logger: Logger;
  confirm?: ConfirmationCallback;
  cwd?: string;
  dry?: boolean;
  target: Version.ReleaseType | Version.SemVer;
  codemodsOnly?: boolean;
}
