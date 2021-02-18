// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import { cloneDeep } from 'lodash';
import invariant from 'invariant';

class FieldApi {
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
  return new FieldApi();
};
