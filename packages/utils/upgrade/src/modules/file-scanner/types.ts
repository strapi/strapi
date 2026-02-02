export interface FileScanner {
  cwd: string;

  scan(patterns: string[]): string[];
}
