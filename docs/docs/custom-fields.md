---
title: Custom fields
slug: /custom-fields
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

To register a custom field on the server, see [documentation](https://docs.strapi.io/developer-docs/latest/development/custom-fields.html#registering-a-custom-field-on-the-server).

The custom field will be added to Strapi during the server [register lifecycle](https://docs.strapi.io/developer-docs/latest/developer-resources/plugin-api-reference/server.html#register).

The `type: customField` saved on the schema.json for a content-type or component is converted to the underlying Strapi data type by calling the [convertCustomFieldType function](https://github.com/strapi/strapi/blob/a8f807d27ebc9c8b9b335e885154a06c60a896ae/packages/core/strapi/lib/Strapi.js#L395) as soon as the app starts during the `register` lifecycle, right after all custom fields have been loaded.

### Admin

To register a custom field to the admin panel, see [documentation](https://docs.strapi.io/developer-docs/latest/development/custom-fields.html#registering-a-custom-field-in-the-admin-panel).

A custom field being saved on a content-type or component will have it’s underlying data type converted from the underlying data type to `type: customField` just before save in the [formatAttributes function](https://github.com/strapi/strapi/blob/33debd57010667a3fc5dfa343a673206cfb956e1/packages/core/content-type-builder/admin/src/components/DataManagerProvider/utils/cleanData.js#L97-L100) of the `cleanData` util

### Packaging

A custom field can be registered in either a Strapi application or Strapi plugin. However, they can only be shared through plugins by publishing the package on npm.

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
