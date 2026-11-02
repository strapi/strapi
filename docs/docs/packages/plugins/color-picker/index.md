---
title: '@strapi/plugin-color-picker'
sidebar_label: 'color-picker'
description: 'Adds a color custom field that stores a HEX string and shows a color picker in the admin panel.'
package: '@strapi/plugin-color-picker'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The admin `register` function types `app` as `any` (see the TODO in `admin/src/index.ts`). Check the custom field option shapes against the `StrapiApp` types before you rely on them.
---

## Purpose

`@strapi/plugin-color-picker` adds one custom field named `color`. The field stores a HEX color as a string. In the Content Manager, editors choose the color with a saturation and hue picker or type the HEX value. The plugin has a server part and an admin part. Application developers add it to a project. Strapi maintains it as an official custom field plugin.

## Key concepts

### Two-sided custom field registration

A custom field needs a registration on both sides. The server declares the field type. The admin declares how the field looks and behaves.

- Server: [`server/src/register.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/color-picker/server/src/register.ts) calls `strapi.customFields.register({ name: 'color', plugin: 'color-picker', type: 'string' })`. The registry stores it under the UID `plugin::color-picker.color`.
- Admin: [`admin/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/color-picker/admin/src/index.ts) calls `app.customFields.register` with the same `name` and `type`, and with `pluginId: 'color-picker'`.

The plugin has no `bootstrap` function, no content types and no services.

### Underlying type

The custom field uses the `string` type. The server registry accepts only a fixed list of types for custom fields, and `string` is one of them. An attribute that uses the field has `type: 'string'` and `customField: 'plugin::color-picker.color'` in its schema.

### Admin registration options

The admin call sets `icon` (`ColorPickerIcon`), `intlLabel`, `intlDescription` and `components.Input`. `Input` is a lazy import of `ColorPickerInput`, so the picker code loads only when a form needs it. The `options.advanced` list adds two settings to the Content-Type Builder form: a `regex` text option with a default HEX pattern, and a `required` checkbox.

### Input component

`ColorPickerInput` in `admin/src/components/` reads and writes the value with `useField` from `@strapi/strapi/admin`. It shows a toggle button and a design system `Popover`. The popover holds a `HexColorPicker` from `react-colorful` and a text input for the HEX value. An empty value means no color, and the component does not default to black.

### Translations

`registerTrads` loads `translations/<locale>.json` and prefixes the keys with the plugin id. Locales without a file get an empty object.

## Related

- [Container and registries](../../../architecture/03-container-and-registries.md): the `custom-fields` registry and the `strapi.customFields` service.
- [Extension points](../../../architecture/04-extension-points.md): how plugins add server behavior in `register`.
- [Content-Type Builder](../../core/content-type-builder/index.md): shows registered custom fields when a developer adds an attribute.
- [Content Manager](../../core/content-manager/index.md): renders the `Input` component in the edit view.
