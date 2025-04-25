import type { OpenAPIV3 } from 'openapi-types';
import { createDebugger } from '../utils';

import type { Component, ComponentType } from './types';

const debug = createDebugger('registry:components');

export class ComponentRegistry {
  private _components: OpenAPIV3.ComponentsObject = {};

  add<T extends ComponentType>(component: T, name: string, schema: Component<T>) {
    if (!(component in this._components)) {
      this._components[component] = {};
    }

    const alreadyExists = name in (this._components[component] ?? {});
    if (alreadyExists) {
      debug('a %o component already exists with the name %o, overriding...', component, name);
    }

    Object.assign(this._components[component]!, { [name]: schema });

    return this;
  }

  $ref(component: ComponentType, name: string): OpenAPIV3.ReferenceObject {
    return { $ref: `#/components/${component}/${name}` };
  }

  export(): OpenAPIV3.ComponentsObject {
    return { ...this._components };
  }
}
