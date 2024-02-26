---
id: 'RenderAdminArgs'
title: 'Interface: RenderAdminArgs'
sidebar_label: 'RenderAdminArgs'
sidebar_position: 0
custom_edit_url: null
---

## Properties

### customisations

• **customisations**: `Object`

#### Type declaration

| Name                            | Type                                                                                                                                                                                                                                                                                                                                               |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap?`                    | (`app`: `StrapiApp`) => `void` \| `Promise`<`void`\>                                                                                                                                                                                                                                                                                               |
| `config?`                       | \{ `auth?`: \{ `logo`: `string` } ; `head?`: \{ `favicon`: `string` } ; `locales?`: `string`[] ; `menu?`: \{ `logo`: `string` } ; `notifications?`: \{ `releases`: `boolean` } ; `theme?`: \{ `dark`: `DefaultTheme` ; `light`: `DefaultTheme` } ; `translations?`: `Record`<`string`, `Record`<`string`, `string`\>\> ; `tutorials?`: `boolean` } |
| `config.auth?`                  | \{ `logo`: `string` }                                                                                                                                                                                                                                                                                                                              |
| `config.auth.logo`              | `string`                                                                                                                                                                                                                                                                                                                                           |
| `config.head?`                  | \{ `favicon`: `string` }                                                                                                                                                                                                                                                                                                                           |
| `config.head.favicon`           | `string`                                                                                                                                                                                                                                                                                                                                           |
| `config.locales?`               | `string`[]                                                                                                                                                                                                                                                                                                                                         |
| `config.menu?`                  | \{ `logo`: `string` }                                                                                                                                                                                                                                                                                                                              |
| `config.menu.logo`              | `string`                                                                                                                                                                                                                                                                                                                                           |
| `config.notifications?`         | \{ `releases`: `boolean` }                                                                                                                                                                                                                                                                                                                         |
| `config.notifications.releases` | `boolean`                                                                                                                                                                                                                                                                                                                                          |
| `config.theme?`                 | \{ `dark`: `DefaultTheme` ; `light`: `DefaultTheme` }                                                                                                                                                                                                                                                                                              |
| `config.theme.dark`             | `DefaultTheme`                                                                                                                                                                                                                                                                                                                                     |
| `config.theme.light`            | `DefaultTheme`                                                                                                                                                                                                                                                                                                                                     |
| `config.translations?`          | `Record`<`string`, `Record`<`string`, `string`\>\>                                                                                                                                                                                                                                                                                                 |
| `config.tutorials?`             | `boolean`                                                                                                                                                                                                                                                                                                                                          |

#### Defined in

packages/core/admin/dist/admin/src/render.d.ts:4

---

### features

• `Optional` **features**: `FeaturesConfig`

#### Defined in

packages/core/admin/dist/admin/src/render.d.ts:9

---

### plugins

• **plugins**: `undefined` \| `Record`<`string`, `StrapiAppPlugin`\>

#### Defined in

packages/core/admin/dist/admin/src/render.d.ts:8
