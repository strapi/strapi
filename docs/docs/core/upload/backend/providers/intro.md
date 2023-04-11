---
title: Introduction
slug: /upload
tags:
  - upload
---

# Provider

Extends the upload plugin, to connect to different external services or applications, such as Amazon S3 buckets, Cloudinary, etc.

**In the case of the Upload plugin, the provider should be able to upload files to a remote server and delete them.**

# Using a provider

To use a provider, you need to install it and configure it in the `./config/plugins.js` file.

More info about installing providers on [strapi docs](https://docs.strapi.io/developer-docs/latest/development/providers.html#installing-providers).

# Provider development

To create a provider, you need to create a package that exports a function that returns an object with the following methods:

- `isPrivate()` (optional) - Returns a boolean indicating if the provider is private or not. If it is, the `getSignedUrl` method will be used to get the URL of the file. (default: `false`)
- `getSignedUrl(file)`. (optional) - Returns a signed URL to access the file if it requires authentication
- `upload(file)` - Uploads a file to the provider
- `uploadStream(stream)` (optional) - Uploads a stream to the provider
- `delete(file)` - Deletes a file from the provider
