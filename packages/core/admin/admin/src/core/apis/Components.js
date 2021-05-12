import invariant from 'invariant';

class Components {
  constructor() {
    this.components = {};
  }

  add(component) {
    const { name, Component } = component;

    invariant(Component, 'A Component must be provided');
    invariant(name, 'A name must be provided');
    invariant(this.components[name] === undefined, 'A similar field already exists');

    this.components[name] = Component;
  }
}

export default () => new Components();
