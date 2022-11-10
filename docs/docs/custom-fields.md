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

The `type: customField` saved on the schema.json for a content-type or component is converted to the underlying Strapi data type by calling the [convertCustomFieldType function](https://github.com/strapi/strapi/blob/a8f807d27ebc9c8b9b335e885154a06c60a896ae/packages/core/strapi/lib/Strapi.js#L395) as soon as the app starts during the `register` lifecycle, right after all custom fields have been loaded.

### Admin

To register a custom field on the server, see [documentation](https://docs.strapi.io/developer-docs/latest/development/custom-fields.html#registering-a-custom-field-on-the-server).

To register a custom field to the admin panel, see [documentation](https://docs.strapi.io/developer-docs/latest/development/custom-fields.html#registering-a-custom-field-in-the-admin-panel).

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
