import { ComponentsWriter } from './component-writer';

import type { PostProcessor } from './types';

export class PostProcessorsFactory {
  createAll(): PostProcessor[] {
    return [new ComponentsWriter()];
  }
}
