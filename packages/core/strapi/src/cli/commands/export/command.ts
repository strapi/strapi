import { createCommand, Option } from 'commander';

import {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} from '../../utils/data-transfer';
import { promptEncryptionKey } from '../../utils/commander';
import action from './action';
import { prepareExportDirFormatCli } from './validate-dir-format';

/**
 * `$ strapi export`
 */
const command = () => {
  return createCommand('export')
    .description('Export data from Strapi to file')
    .allowExcessArguments(false)
    .addOption(
      new Option('--no-encrypt', `Disables 'aes-128-ecb' encryption of the output file`).default(
        true
      )
    )
    .addOption(
      new Option('--no-compress', 'Disables gzip compression of output file').default(true)
    )
    .addOption(new Option('--verbose', 'Enable verbose logs'))
    .addOption(
      new Option(
        '-k, --key <string>',
        'Provide encryption key in command instead of using the prompt'
      )
    )
    .addOption(
      new Option(
        '-f, --file <file>',
        'tar: base name without extensions; dir: output directory path (--format dir)'
      )
    )
    .addOption(
      new Option('--format <format>', 'export as tar archive or unpacked directory')
        .choices(['tar', 'dir'])
        .default('tar')
    )
    .addOption(excludeOption)
    .addOption(onlyOption)
    .addOption(throttleOption)
    .hook('preAction', validateExcludeOnly)
    .hook('preAction', prepareExportDirFormatCli)
    .hook('preAction', promptEncryptionKey)
    .action(action);
};

export default command;
