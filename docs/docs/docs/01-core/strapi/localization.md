---
title: Localization provider
---

Core depends on `Core.LocalizationProvider`, exposed through `strapi.localization`, for localization
behavior. The i18n plugin registers its implementation during `register`, before database migrations
and content-type synchronization. Plugins that register before i18n, and API modules, see the inert
defaults during their own `register`. The adapter resolves i18n services when called, so services
replaced or extended through the services registry after i18n's `register` are observed;
`src/extensions/` overrides are applied at load time and need no such care. Core does not import
i18n's contracts or look up the plugin by name. Only one provider can be registered per application:
a second registration throws.

Without a provider, `isEnabled()` is `false`, content types are treated as nonlocalized, the
default locale is `null`, the locale list, populate paths and nonlocalized attributes are empty,
and copying nonlocalized fields leaves the entry unchanged. Use `isEnabled()` when the absence of
a localization plugin must be told apart from a plugin with zero locales.
Each Strapi instance has its own provider.
