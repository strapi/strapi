import type { Extensions } from '../../core/exports';
import type { Targets } from '../../createBuildContext';

interface ViteTaskEntry {
  path: string;
  entry: string;
}

interface ViteBaseTask {
  type: string;
  entries: ViteTaskEntry[];
  format: Extensions;
  output: string;
  runtime: keyof Targets;
}

export type { ViteBaseTask, ViteTaskEntry };
