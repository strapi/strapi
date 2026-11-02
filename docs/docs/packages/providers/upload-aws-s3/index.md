---
title: '@strapi/provider-upload-aws-s3'
sidebar_label: 'upload-aws-s3'
description: 'AWS S3 provider for strapi upload'
package: '@strapi/provider-upload-aws-s3'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Stores uploaded files in Amazon S3 or S3-compatible services (MinIO, Wasabi, DigitalOcean Spaces, etc.). The upload plugin loads this provider when configured with `provider: 'aws-s3'`. Use it for cloud deployments, multi-instance setups, or any application that needs scalable, remote file storage.

## Key concepts

- Implements the upload provider interface: `init(providerOptions)` returns an object with `upload(file)`, `uploadStream(file)`, `replace(newFile, oldFile)`, `replaceStream(newFile, oldFile)`, `delete(file)`, plus `isPrivate()`, `getSignedUrl(file)`, and optional metadata methods.
- Reads `providerOptions` keys: `s3Options` (required, S3 client config with `params.Bucket`), `baseUrl` (optional, CDN or custom domain), `rootPath` (optional, prefix for keys), `providerConfig` (optional, with `checksumAlgorithm`, `preventOverwrite`, `storageClass`, `encryption`, `tags`, `multipart` settings).
- Supports private buckets with signed URL generation; uses `isPrivate()` to check if ACL is private, then `getSignedUrl()` generates temporary access links.
- S3-compatible providers: warns on AWS-specific features (storage class, KMS encryption) when using non-AWS endpoints; validates multipart configuration.
- Credentials resolve from AWS SDK credential chain (environment, IAM roles, config file) or explicit options.
- Source: [github.com/strapi/strapi/tree/develop/packages/providers/upload-aws-s3](https://github.com/strapi/strapi/tree/develop/packages/providers/upload-aws-s3)

## Related

- [Upload plugin](../../core/upload/index.md)
- [Upload providers overview](../../core/upload/01-backend/00-providers.md)
- [Local provider](../upload-local/index.md)
- [Cloudinary provider](../upload-cloudinary/index.md)
