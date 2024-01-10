import path from 'node:path';
import { glob } from 'glob';

import type { FileScanner as FileScannerInterface } from './types';

export class FileScanner implements FileScannerInterface {
  public cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  scan(patterns: string[]) {
    const filenames = glob.sync(patterns, { cwd: this.cwd });

    // Resolve the full paths for every filename
    return filenames.map((filename) => path.join(this.cwd, filename));
  }
}

export const fileScannerFactory = (cwd: string) => new FileScanner(cwd);
