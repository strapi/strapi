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

- Implements the upload provider interface: `init(providerOptions)` returns an object with `upload(file)`, `uploadStream(file)`, `replace(newFile, oldFile)`, `replaceStream(newFile, oldFile)`, and `delete(file)` methods.
- Reads `providerOptions`: Cloudinary SDK config options (cloud_name, api_key, api_secret, etc.).
- Selects upload method automatically: regular stream for files under 99 MB (faster), chunked stream for larger files (required by Cloudinary for 100+ MB).
- Stores metadata: `provider_metadata` includes `public_id` and `resource_type`; replaces in-place if hash matches to invalidate CDN cache.
- Generates preview URLs for videos (sample GIF with configurable resolution).
- Throws `PayloadTooLargeError` when Cloudinary rejects oversized uploads.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/upload-cloudinary](https://github.com/strapi/strapi/tree/develop/packages/providers/upload-cloudinary)

## Related

- [Upload plugin](../../core/upload/index.md)
- [Upload providers overview](../../core/upload/01-backend/00-providers.md)
- [Local provider](../upload-local/index.md)
- [AWS S3 provider](../upload-aws-s3/index.md)
