/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import invariant from 'invariant';

type TField = {
  type: string;
  Component: React.ComponentType;
};

class Fields {
  fields: Record<string, TField['Component']>;

  constructor() {
    this.fields = {};
  }

  add(field: TField) {
    const { type, Component } = field;

    invariant(Component, 'A Component must be provided');
    invariant(type, 'A type must be provided');

    this.fields[type] = Component;
  }
}

export default () => new Fields();
