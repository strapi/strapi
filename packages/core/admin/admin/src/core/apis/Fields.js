import invariant from 'invariant';

class Fields {
  constructor() {
    this.fields = {};
  }

  add(field) {
    const { type, Component } = field;

    invariant(Component, 'A Component must be provided');
    invariant(type, 'A type must be provided');

    this.fields[type] = Component;
  }
}

export default () => new Fields();
