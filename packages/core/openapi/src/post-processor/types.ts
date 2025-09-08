import type { DocumentContext } from '../types';

export interface PostProcessor {
  postProcess(context: DocumentContext): void;
}
