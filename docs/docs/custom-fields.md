---
title: Custom fields
tags:
  - content-type-builder
  - plugins
---

# Custom fields

## Summary

Custom fields provide a way to replace the inputs of existing Strapi types to improve the content editing experience.

## Detailed design

A custom field needs to be registered in both the admin and server.

### Server

We need to ensure that an attribute using a custom field is valid, we expose a new `customFields` object with a `register` method on the `Strapi` instance.

Here's how you register a Custom Field on the server:

```ts
interface CustomFieldServerOptions {
  // The name of the custom field
  name: string;
  // The name of the plugin creating the custom field
  plugin?: string;
  // The existing Strapi data type the custom field will use
  type: string;
}

strapi.customFields.register(
  options: CustomFieldServerOptions | CustomFieldServerOptions[]
);
```

The custom field will be added to Strapi during the server [register lifecycle](https://docs.strapi.io/developer-docs/latest/developer-resources/plugin-api-reference/server.html#register).

### Admin

Here's how you register a Custom Field on the admin:

```tsx

// You can also pass an array of objects to register several custom fields at once
app.customFields.register(
  options: CustomFieldAdminOptions | CustomFieldAdminOptions[]
);

interface CustomFieldAdminOptions {
  // The name of the custom field
  name: string;
  // The name of the plugin creating the custom field
  pluginId?: string;
  // The existing Strapi data type the custom field will use
  type: string;
  // The translation for the name
  intlLabel: IntlObject;
  // The translation for the description
  intlDescription: IntlObject;
  // The icon for the custom field
  icon?: React.ComponentType;
  // The components needed to display the custom field in the Content Manager
  components: {
    // Input component for the Edit view
    Input: () => Promise<{ default: React.ReactComponent }>;
    // Read only component for the List view
    View: () => Promise<{ default: React.ReactComponent }>;
  };
  // The settings to extend in the Content-Type Builder
  options?: {
    base: CTBFormSection[];
    advanced: CTBFormSection[];
    validator: (args) => object;
  }
}

interface IntlObject {
  id: string;
  defaultMessage: string;
}

interface CTBFormSection {
  sectionTitle: IntlObject;
  items: CTBFormInput[];
}

interface CTBFormInput {
  name: string;
  description: InltObject;
  type: string;
  intlLabel: IntlObject;
}
```

For the admin, we will expose a new `customFields` object with a `register` method on the `StrapiApp` instance. The custom field can then be added to Strapi during the admin [bootstrap lifecycle](https://docs.strapi.io/developer-docs/latest/developer-resources/plugin-api-reference/admin-panel.html#bootstrap) by providing the following object to `customFields.register()`.

Note: You can only share a custom field by packaging it into a plugin.

### Example

- [Color Picker](https://github.com/strapi/strapi/blob/main/packages/plugins/color-picker/)
- [Shopify plugin](https://github.com/WalkingPizza/strapi-plugin-shopify-fields/)

## Tradeoffs

- We do not yet offer the ability to create a custom database type in Strapi.
- When extending a custom field’s base and advanced forms in the Content-type Builder, it is not yet possible to import custom input components.
- We do not allow custom fields to use the relation, component, dynamic zone and media types.

## Alternatives

We consider making special packages for Custom fields but :

- Custom fields would not have been able to access other features from the plugin API. While that is not always required, it also enables custom fields that do need it to implement more advanced behaviors. For example, a custom field can also use injection zones if needed.
- Introducing a new custom field type of package would have required a new loader in Strapi, and a new section and review processes on the marketplace, which would have made the feature more complex to ship.
- The overkill aspect of the plugin API for a simple custom field could be mitigated by adding a new plugin generator that only created the files required for a custom field.

## Resources

- [Custom Fields page](https://strapi.io/custom-fields)
- [Docs](https://docs.strapi.io/developer-docs/latest/development/custom-fields.html)
- [non-technical RFC](https://github.com/strapi/rfcs/pull/40)
- [technical RFC](https://github.com/strapi/rfcs/pull/42)
