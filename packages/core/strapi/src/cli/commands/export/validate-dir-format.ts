import type { Command } from 'commander';

import { exitWith } from '../../utils/helpers';

export const EXPORT_DIR_REQUIRES_NO_ENCRYPT =
  'Unpacked directory exports (--format dir) require --no-encrypt.';

export const EXPORT_DIR_ENCRYPTION_NOT_SUPPORTED =
  'Unpacked directory exports (--format dir) do not support encryption. Use --format tar, or omit --encrypt.';

/**
 * Directory exports require an explicit `--no-encrypt` (security). Compression is tar-only and is
 * turned off automatically for `--format dir` (no `--no-compress` needed). Runs before
 * `promptEncryptionKey` so missing `--no-encrypt` fails with a clear message instead of a key prompt.
 */
export function prepareExportDirFormatCli(command: Command) {
  const opts = command.opts();
  const format = opts.format ?? 'tar';
  if (format !== 'dir') {
    return;
  }

  const encrypt = command.getOptionValue('encrypt');
  const encryptSource = command.getOptionValueSource('encrypt');

  if (encrypt === true && encryptSource === 'cli') {
    exitWith(1, EXPORT_DIR_ENCRYPTION_NOT_SUPPORTED);
  }

  const explicitNoEncrypt =
    encrypt === false && (encryptSource === 'cli' || encryptSource === 'env');

  if (!explicitNoEncrypt) {
    exitWith(1, EXPORT_DIR_REQUIRES_NO_ENCRYPT);
  }

  command.setOptionValue('compress', false);
}

/**
 * Same rules for programmatic `exportAction(opts)` (no Commander hooks).
 */
export function normalizeExportDirFormatOpts(opts: {
  format?: 'tar' | 'dir';
  encrypt?: boolean;
  compress?: boolean;
}) {
  const format = opts.format ?? 'tar';
  if (format !== 'dir') {
    return;
  }

  if (opts.encrypt === true) {
    exitWith(1, EXPORT_DIR_ENCRYPTION_NOT_SUPPORTED);
  }

  if (opts.encrypt !== false) {
    exitWith(1, EXPORT_DIR_REQUIRES_NO_ENCRYPT);
  }

  opts.compress = false;
}
