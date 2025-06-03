---
title: Source
tags:
  - providers
  - data-transfer
  - experimental
---

# Strapi File Source Provider

This provider will open and read a Strapi Data File as a data source.

## Provider Options

The accepted options are defined in `ILocalFileSourceProviderOptions`.

```typescript
  file: {
    path: string; // the file to load
  };

  encryption: {
    enabled: boolean; // if the file is encrypted (and should be decrypted)
    key?: string; // the key to decrypt the file
  };

  compression: {
    enabled: boolean; // if the file is compressed (and should be decompressed)
  };
```

Note: When the Strapi CLI attempts to import a file, the options for compression and encryption are set based on the extension of the file being loaded, eg a file with the .gz extension will have the "compress" option set, and a file that includes the .enc extension will have the "encrypt" option set.

When using the transfer engine programmatically, you may make the determination whether the file being loaded should be decrypted or compressed by setting
those options.
