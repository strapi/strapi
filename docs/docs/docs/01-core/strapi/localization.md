---
title: Localization provider
---

Core depends on `Core.LocalizationProvider`, exposed through `strapi.localization`, for
localization behavior. The i18n plugin registers its implementation during `register`, before
database migrations and content-type synchronization. The adapter resolves i18n services when
called, so application extensions installed later remain visible. Core does not import i18n's
contracts or look up the plugin by name.

Without a provider, content types are treated as nonlocalized, the default locale is `null`,
populate paths are empty, and copying nonlocalized fields leaves the entry unchanged.
Each Strapi instance has its own provider.
