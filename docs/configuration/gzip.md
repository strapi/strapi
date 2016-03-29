---
title: Gzip
---

Compression is a simple, effective way to save bandwidth and speed up your site.

Gzip performs best on text-based assets: CSS, JavaScript, HTML. All modern browsers support Gzip compression and will automatically request it.

The best part is that enabling Gzip is one of the simplest and highest payoff optimizations to implement-- sadly, many people still forget to implement it.

## Configuration

Configuration:

- Key: `gzip`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`

Example:

```js
{
  "gzip": true
}
```

Notes:

- Set to `false` to disable Gzip compression.
