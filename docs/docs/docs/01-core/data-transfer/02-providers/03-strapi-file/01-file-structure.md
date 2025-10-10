---
title: Strapi File Structure
tags:
  - providers
  - data-transfer
  - experimental
---

# Strapi File Structure

The Strapi file providers expect a .tar file (optionally compressed with gzip and/or encrypted with 'aes-128-ecb') that internally uses POSIX style file paths with the following structure:

```
./
configuration
entities
links
metadata.json
schemas

./configuration:
configuration_00001.jsonl

./entities:
entities_00001.jsonl

./links:
links_00001.jsonl

./schemas:
schemas_00001.jsonl
```

## metadata.json

This file provides metadata about the original source of the data. At minimum, it should include a createdAt timestamp and the version of Strapi that the file was created with (for compatibility checks).

```json
{
  "createdAt": "2023-06-26T07:31:20.062Z",
  "strapi": {
    "version": "4.11.2"
  }
}
```

## A directory for each stage of data

There should also be a directory for each stage of data that includes sequentially numbered JSON Lines (.jsonl) files

The files are named in the format: `{stage}\{stage}_{5-digit sequence number}.jsonl`

Any number of files may be provided for each stage, as long as the sequence numbers are in order. That is, after first reading 00001, the file source provider will attempt to read file 00002 and if it is not found, it will consider the stage complete.

### JSONL files

[JSON Lines](https://jsonlines.org/) files are essentially JSON files, except that newline characters are used to delimit the JSON objects. This allows the provider to read in a single line at a time, rather than loading the entire file into memory, minimizing RAM usage during a transfer and allowing files containing any amount of data.
