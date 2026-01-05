---
title: Blocks editor
description: The modern JSON-based rich text editor
tags:
  - content-manager
---

The blocks editor is a modern text editor based on the [Slate.js library](https://docs.slatejs.org/). It is designed as the successor to the classic markdown editor, and can only be used within the content-manager.

## Data format

### Why JSON

While the markdown editor stores content as a string, Blocks stores it as a JSON object. This is Strapi is headless, so we want a format that makes it easy to map on the content we want to offer a good experience for non-web use cases too.In the case of React frontends, JSON also means we don't need to rely on `dangerouslySetInnerHTML` to render the formatted content.

### Slate-based schema

The blocks editor schema is based on Slate.js, which allows us to design our own custom schema structure. One specificity of our implementation is that leaf nodes include a `type: 'text'` entry in addition to the standard `text` property. We chose Slate in part because its JSON format remains human-readable.
