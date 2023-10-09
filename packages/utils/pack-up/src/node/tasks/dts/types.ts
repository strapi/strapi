interface DtsTaskEntry {
  importId: string;
  exportPath: string;
  sourcePath: string;
  targetPath: string;
}

interface DtsBaseTask {
  type: string;
  entries: DtsTaskEntry[];
}

export type { DtsBaseTask, DtsTaskEntry };
