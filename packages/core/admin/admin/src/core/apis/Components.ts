/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import invariant from 'invariant';

interface TComponent {
  name: string;
  Component: React.ComponentType;
}

class Components {
  components: Record<string, TComponent['Component']>;

  constructor() {
    this.components = {};
  }

  add(component: TComponent) {
    const { name, Component } = component;

    invariant(Component, 'A Component must be provided');
    invariant(name, 'A name must be provided');
    invariant(this.components[name] === undefined, 'A similar field already exists');

    this.components[name] = Component;
  }
}

export default () => new Components();
