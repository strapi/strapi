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

i18n's own surface (the `locale` and `localizations` attributes it adds to content types, its
routes, GraphQL extension and sanitizers) reads the schema flag through its own services and
does not consult `strapi.localization`. A provider's `isLocalizedContentType` must therefore agree with that flag.

Without a provider, `isEnabled()` is `false`, content types are treated as nonlocalized, the
default locale is `null`, the locale list, populate paths and nonlocalized attributes are empty,
and copying nonlocalized fields leaves the entry unchanged. Use `isEnabled()` when the absence of
a localization plugin must be told apart from a plugin with zero locales. These defaults serve
test fixtures, embeddings and providers from other plugins; the bundled i18n plugin cannot be
disabled through configuration, so a stock application always has a provider. Each Strapi instance
has its own provider.
