---
title: '@strapi/provider-upload-local'
sidebar_label: 'upload-local'
description: 'Local provider for strapi upload'
package: '@strapi/provider-upload-local'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Stores uploaded files on the local filesystem in the `public/uploads/` directory. The upload plugin loads this provider by default when no other provider is configured. Use it for development, testing, or single-server deployments. For multi-instance or cloud deployments, switch to S3, Cloudinary, or another remote provider.

## Key concepts

- Implements the upload provider interface: `init(providerOptions)` returns an object with `upload(file)`, `uploadStream(file)`, `replace(newFile, oldFile)`, `replaceStream(newFile, oldFile)`, `delete(file)`, and `checkFileSize(file, options)` methods.
- Reads `providerOptions` key: `sizeLimit` (optional, deprecated; moved to plugin config).
- Stores files in `<strapi.dirs.static.public>/uploads/` with filename `<hash><ext>`; checks that the uploads folder exists on init.
- URL set to `/<hash><ext>` (relative to public directory).
- Supports both stream and buffer upload paths; replaces by writing new file first, then deleting old if the path changed (never leaves a gap).
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/upload-local](https://github.com/strapi/strapi/tree/develop/packages/providers/upload-local)

## Related

- [Upload plugin](../../core/upload/index.md)
- [Upload providers overview](../../core/upload/01-backend/00-providers.md)
- [AWS S3 provider](../upload-aws-s3/index.md)
- [Cloudinary provider](../upload-cloudinary/index.md)
