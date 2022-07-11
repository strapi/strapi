import invariant from 'invariant';

class CustomFields {
  constructor() {
    this.customFields = {};
  }

  register(customField) {
    const { name, pluginId, type, intlLabel, intlDescription, components } = customField;

    // Ensure required attributes are provided
    invariant(name, 'A name must be provided');
    invariant(type, 'A type must be provided');
    invariant(intlLabel, 'An intlLabel must be provided');
    invariant(intlDescription, 'An intlDescription must be provided');
    invariant(components, 'A components object must be provided');
    invariant(components.Input, 'An Input component must be provided');

    // When no plugin is specified, default to the global namespace
    const namespace = pluginId ? `plugin::${pluginId}.${name}` : `global::global.${name}`;

    // Ensure the namespace is unique
    const namespaceAlreadyUsed = Object.prototype.hasOwnProperty.call(this.customFields, namespace);
    invariant(!namespaceAlreadyUsed, 'A similar custom field already exists');

    this.customFields[namespace] = customField;
  }
}

export default () => new CustomFields();
