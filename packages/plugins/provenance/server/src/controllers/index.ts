import { createEntriesController } from './entries';
import { createSettingsController } from './settings';
import { createTokensController } from './tokens';

export default {
  entries: createEntriesController,
  settings: createSettingsController,
  tokens: createTokensController,
};
