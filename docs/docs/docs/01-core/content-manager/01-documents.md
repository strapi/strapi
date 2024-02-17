---
title: Documents
description: An introduction to documents in the content-manager
tags:
  - content-manager
  - documents
---

At the very core of the CM is the concept of a document. Although the logic for creating a document lives primarily within the `@strapi/core` package, we still need to understand what they are to interact with them. Introduced for the _new_ draft & publish feature in V5 (Q1 2024), documents are essentially a matrix of entries, this matrix grows in complexity based on the amount of dimensions your doucment has. For example, having Draft & Publish and Internationalisation (with 2 locales) enabled would give you 4 entries within the document – a draft for each locale and a published entry for each locale.

:::note
Draft & Publish is optional on content-types
:::

## Getting Documents

We get documents via the [`useDocument`](./hooks/use-document.mdx) hook, which requires us to understand which "model" we want – the model is basically which content-type e.g. `api::article.article`, the "kind" of content-type e.g. `single-type` or `collection-type` and the specific `id` of said document. Using these three parameters we can fetch any document, without passing specific parameters e.g. `locale` we get a default version defined by the user's application. However, all dimensions should be queryable to narrow down the point on the document matrix to a specific entry e.g. `published & 'en-GB'`.

## Interacting with Documents

There are universal actions that can be performed on documents, these are:

- `create` – creates a new document
- `update` – updates an existing document
- `delete` – deletes an existing document

Documents that are `collection-types` additionally can be cloned. If a document has draft & published enabled then we can additionally publish & unpublish the document. All of this functionality is exposed via the [`useDocumentActions`](./hooks/use-document-actions.mdx) hook. Additional actions can be added by plugins via APIs.
