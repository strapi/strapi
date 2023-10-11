import type { UserConfig } from '@commitlint/types';
import { RuleConfigSeverity } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      ['chore', 'ci', 'docs', 'feat', 'fix', 'release', 'revert', 'test'],
    ],
  },
};

module.exports = config;
