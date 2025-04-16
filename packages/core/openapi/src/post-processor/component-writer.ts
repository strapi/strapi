import type { DocumentContext } from '../types';
import type { PostProcessor } from './types';

export class ComponentsWriter implements PostProcessor {
  postProcess(context: DocumentContext): void {
    context.output.data.components = context.registries.components.export();
  }
}
