---
title: '@strapi/content-manager'
sidebar_label: 'content-manager'
description: 'Core plugin with the admin panel list, edit and configuration views for documents, and the admin API routes behind them.'
package: '@strapi/content-manager'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

The content-manager (CM) is a core plugin that allows users to write, update and delete their content. It runs on the server and in the admin panel. In its most basic form, the CM is a table and a few forms.

The admin part exports plugin APIs to change these forms and tables, and some universal hooks that other plugins can use inside and outside of the CM. The server part serves the admin API routes behind the views and checks permissions. Other core plugins, such as content-releases, review-workflows and i18n, extend it.

## Key concepts

### Documents

At the core of the CM is the concept of a document. The logic that creates a document lives in `@strapi/core`, but the CM needs to know what a document is to work with it. The CM gets documents with the [`useDocument`](./hooks/use-document.md) hook and changes them with the [`useDocumentActions`](./hooks/use-document-actions.md) hook. Read [Documents](./01-documents.md).

### Layouts

A layout is a data structure that tells the CM how to render the list view and the edit view. Plugins can change the edit layout with the `Admin/CM/pages/EditView/mutate-edit-view-layout` hook. They can add columns to the list view. The list and edit settings of each content type and component live in the core store, and the `content-types` and `components` services reconcile them with the schemas at `bootstrap`. Read [Layouts](./02-layouts.md).

### Plugin APIs

The admin part registers a plugin object (`ContentManagerPlugin`) with these methods: `addEditViewSidePanel`, `addDocumentAction`, `addDocumentHeaderAction`, `addBulkAction` and `addRichTextBlocks`. Other plugins reach them with `app.getPlugin('content-manager').apis`. The content-releases plugin uses this route. See [Content releases in the Content Manager](./03-content-releases.md). The public exports are in [`admin/src/exports.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-manager/admin/src/exports.ts).

### Permissions

The server checks permissions with the `permission-checker` service, on the actions `plugin::content-manager.explorer.*`. The admin part wraps the list, edit, history and preview views in the `DocumentRBAC` provider, so components can read the permissions of the current document. Read [RBAC](./03-RBAC.md) and [Permission checker](./services/00-permission-checker.md).

### Server services and routes

The routes are admin routes, mounted under `/content-manager`. A `routing` middleware can send a request to another controller action if the config `layout.<model>.actions.<action>` sets one. The `document-manager` service wraps `strapi.documents` with the deep populate that the views need. It works next to the `populate-builder`, `document-metadata` and `content-types` services. At `bootstrap`, the plugin also registers MCP tools for the displayed content types when the MCP server is enabled. Code: [`server/src`](https://github.com/strapi/strapi/tree/develop/packages/core/content-manager/server/src).

### Relations and blocks

The edit view response holds only a count for each relation field, and the relations input loads and tracks the related documents itself, with its own `relations` controller on the server. Read [Relations](./04-relations.md). The blocks editor is a JSON-based rich text field built on Slate, and it works only inside the CM. Read [Blocks editor](./05-blocks.md).

### History and preview

`server/src/history` and `admin/src/history` hold the content history feature. It is an Enterprise feature, gated by `cms-content-history`. When the gate is off, the plugin still registers the `historyVersion` model so that no data is lost. The `preview` folders hold the live preview. Read [Live preview](./06-preview.md). Both folders carry their own `LICENSE` file.

## Related

- [Document write path](../../../architecture/05-document-write-path.md): the Document Service calls behind the CM actions.
- [Enterprise Edition](../../../architecture/09-enterprise-edition.md): how the history gate works.
- [Extension points](../../../architecture/04-extension-points.md): server-side ways to extend the CM routes and documents.
- [HTTP request path](../../../architecture/06-http-request-path.md): how an admin route reaches a CM controller.
- [`@strapi/admin`](../admin/index.md): provides the app shell, the plugin registry and the permission model.
- [`@strapi/content-releases`](../content-releases/index.md): adds a side panel, an action and a column.
- [`@strapi/content-type-builder`](../content-type-builder/index.md): defines the content types that the CM edits.
- [`@strapi/core`](../core/index.md): provides the Document Service and the core store.
