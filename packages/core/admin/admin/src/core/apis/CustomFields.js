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
    const uid = pluginId ? `plugin::${pluginId}.${name}` : `global::${name}`;

    // Ensure the namespace is unique
    const uidAlreadyUsed = Object.prototype.hasOwnProperty.call(this.customFields, uid);
    invariant(!uidAlreadyUsed, 'A similar custom field already exists');

    this.customFields[uid] = customField;
  }
}

export default () => new CustomFields();
