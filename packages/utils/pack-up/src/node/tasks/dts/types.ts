interface DtsTaskEntry {
  importId: string;
  exportPath: string;
  sourcePath: string;
  targetPath: string;
  /**
   * Allow a particular task to have it's own tsconfig
   * great for when you're creating a server & web bundle
   * package.
   */
  tsconfig?: string;
}

interface DtsBaseTask {
  type: string;
  entries: DtsTaskEntry[];
}

export type { DtsBaseTask, DtsTaskEntry };
