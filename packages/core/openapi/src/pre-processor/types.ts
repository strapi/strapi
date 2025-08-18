import type { DocumentContext } from '../types';

export interface PreProcessor {
  preProcess(context: DocumentContext): void;
}
