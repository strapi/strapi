---
title: Destination
tags:
  - providers
  - data-transfer
  - experimental
---

# Strapi File Destination Provider

This provider will output a Strapi Data File.

Note: this destination provider does not provide a schema or metadata, and will therefore never report a schema match error or version validation error

## Provider Options

The accepted options are defined in `ILocalFileDestinationProviderOptions`.

```typescript
  encryption: {
    enabled: boolean; // if the file should be encrypted
    key?: string; // the key to use when encryption.enabled is true
  };

  compression: {
    enabled: boolean; // if the file should be compressed with gzip
  };

  file: {
    path: string; // the filename to create
    maxSize?: number; // the max size of a single backup file
    maxSizeJsonl?: number; // the max lines of each jsonl file before creating the next file
  };
```
