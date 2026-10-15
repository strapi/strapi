---
title: Overview
description: 'Overview of local Strapi instance data transfer provider.'
tags:
  - providers
status: needs-review
review_notes:
  - Mentions the Entity Service; the providers use `strapi.db.query`.
---

# Local Strapi Providers

The local Strapi provider allows using the local Strapi instance (the same project that the data transfer engine is being run from) as a data source.

Creating a local Strapi data provider requires passing in an initialized `strapi` server object to interact with that server's Entity Service and Query Engine to manage the data. Therefore if the local Strapi project cannot be started (due to errors), the providers cannot be used.

**Important**: When a transfer completes, the `strapi` object passed in is shut down automatically based on the `autoDestroy` option. If you are running a transfer via an external script, it is recommended to use `autoDestroy: true` to ensure it is shut down properly, but if you are running a transfer within a currently running Strapi instance you should set `autoDestroy: false` or your Strapi instance will be shut down at the end of the transfer.
