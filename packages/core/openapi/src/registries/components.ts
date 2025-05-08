import type { OpenAPIV3 } from 'openapi-types';

// TODO maintaining this package only to extend this class
// Ideally we should remove it
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import type { ComponentType } from './types';

export class ComponentRegistry extends OpenAPIRegistry {
  constructor() {
    super();
  }

  $ref(component: ComponentType, name: string): OpenAPIV3.ReferenceObject {
    return { $ref: `#/components/${component}/${name}` };
  }
}
