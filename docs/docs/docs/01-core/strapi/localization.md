---
title: Localization provider
---

Core depends on `Core.LocalizationProvider`, exposed through `strapi.localization`, for
localization behavior. The i18n plugin registers its implementation during `register`, before
database migrations and content-type synchronization. The adapter resolves i18n services when
called, so application extensions installed later remain visible. Core does not import i18n's
contracts or look up the plugin by name.

Without a provider, `isEnabled()` is `false`, content types are treated as nonlocalized, the
default locale is `null`, the locale list, populate paths and nonlocalized attributes are empty,
and copying nonlocalized fields leaves the entry unchanged. Use `isEnabled()` when the absence of
a localization plugin must be told apart from a plugin with zero locales.
Each Strapi instance has its own provider.
