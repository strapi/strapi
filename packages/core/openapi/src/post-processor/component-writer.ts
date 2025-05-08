import type { DocumentContext } from '../types';
import type { PostProcessor } from './types';

export class ComponentsWriter implements PostProcessor {
  postProcess(context: DocumentContext): void {
    const { output, registries } = context;

    // TODO: not sure what's going on with components
    output.data.components = registries.components.definitions;
  }
}
