---
title: '@strapi/provider-upload-cloudinary'
sidebar_label: 'upload-cloudinary'
description: 'Cloudinary provider for strapi upload'
package: '@strapi/provider-upload-cloudinary'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Stores uploaded files in Cloudinary for image and video management, transformations, and CDN delivery. The upload plugin loads this provider when configured with `provider: 'cloudinary'`. Use it when your content includes rich media and you need automatic optimization, transformations, or video processing.

## Key concepts

- Implements the upload provider interface: `init(providerOptions)` returns an object with `upload(file, options)`, `uploadStream(file, options)`, `replace(newFile, oldFile, options)`, `replaceStream(newFile, oldFile, options)`, and `delete(file, options)` methods. The options are Cloudinary upload options (destroy options for `delete`), from the method's `actionOptions` entry.
- Reads `providerOptions`: Cloudinary SDK config options (cloud_name, api_key, api_secret, etc.).
- Selects upload method automatically: regular stream for files under 99 MB (faster), chunked stream for larger files (required by Cloudinary for 100+ MB).
- Stores metadata: `provider_metadata` includes `public_id` and `resource_type`; `replace` always uploads with `overwrite: true` and `invalidate: true` (set after the caller options), pins the old `public_id` and drops `folder` (from the options or the file path) when the old `public_id` equals the new hash, so that asset never moves, and destroys the old asset only when the new one has a different `public_id` or `resource_type`. A move would destroy the old asset before the upload plugin updates the file row, and a failed format replace would then leave the row on a destroyed asset.
- Generates preview URLs for videos (sample GIF with configurable resolution).
- Throws `PayloadTooLargeError` when Cloudinary rejects oversized uploads.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/upload-cloudinary](https://github.com/strapi/strapi/tree/develop/packages/providers/upload-cloudinary)

## Related

- [Upload plugin](../../core/upload/index.md)
- [Upload providers overview](../../core/upload/01-backend/00-providers.md)
- [Local provider](../upload-local/index.md)
- [AWS S3 provider](../upload-aws-s3/index.md)
