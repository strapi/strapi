import { cloneDeep } from 'lodash';
import invariant from 'invariant';

// TODO this API should be merged with the components one
class Fields {
  fields = {};

  getField = type => {
    invariant(type, 'A type must be provided');

    return cloneDeep(this.fields[type]) || null;
  };

  getFields = () => {
    const fields = cloneDeep(this.fields);

    return Object.keys(fields).reduce((acc, current) => {
      acc[current] = fields[current].Component;

      return acc;
    }, {});
  };

  registerField = field => {
    const { type, Component } = field;

    invariant(Component, 'A Component must be provided');
    invariant(type, 'A type must be provided');
    invariant(this.fields[type] === undefined, 'A similar field already exists');

    this.fields[type] = { Component };
  };

  removeField = type => {
    invariant(type, 'A type must be provided in order to remove a field');

    delete this.fields[type];
  };
}

export default () => {
  return new Fields();
};
