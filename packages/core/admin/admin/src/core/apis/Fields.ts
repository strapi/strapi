/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import invariant from 'invariant';

export interface Field {
  type: string;
  Component: React.ComponentType;
}

export class Fields {
  fields: Record<Field['type'], Field['Component']>;

  constructor() {
    this.fields = {};
  }

  add(field: Field) {
    const { type, Component } = field;

    invariant(Component, 'A Component must be provided');
    invariant(type, 'A type must be provided');

    this.fields[type] = Component;
  }
}
