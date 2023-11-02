/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import invariant from 'invariant';

export interface Component {
  name: string;
  Component: React.ComponentType;
}

export class Components {
  components: Record<Component['name'], Component['Component']>;

  constructor() {
    this.components = {};
  }

  add(component: Component) {
    const { name, Component } = component;

    invariant(Component, 'A Component must be provided');
    invariant(name, 'A name must be provided');
    invariant(this.components[name] === undefined, 'A similar field already exists');

    this.components[name] = Component;
  }
}
